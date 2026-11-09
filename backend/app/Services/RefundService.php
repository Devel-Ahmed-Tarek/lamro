<?php

namespace App\Services;

use App\Models\CreditNote;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Stripe\Refund;
use Stripe\Stripe;
use Stripe\Checkout\Session;

class RefundService
{
    public function __construct(
        private InventoryService $inventory,
        private AuditLogger $audit,
        private NotifyService $notify,
        private StripePaymentService $stripe,
    ) {}

    /**
     * Full (or partial) refund: money + credit note + optional restock.
     *
     * @return array{order: Order, credit_note: CreditNote, payment: Payment}
     */
    public function refundOrder(
        Order $order,
        User $admin,
        ?int $amountCents = null,
        ?string $reason = null,
        bool $restock = true,
    ): array {
        return DB::transaction(function () use ($order, $admin, $amountCents, $reason, $restock) {
            $order = Order::query()->lockForUpdate()->with(['items', 'payment', 'invoice', 'user'])->findOrFail($order->id);
            $payment = $order->payment;

            if (! $payment || ! in_array($payment->status, ['received', 'refunded'], true)) {
                throw ValidationException::withMessages(['payment' => ['Only paid orders can be refunded.']]);
            }

            $already = (int) ($payment->refunded_cents ?? 0);
            $max = max(0, (int) $payment->amount_cents - $already);

            if ($max < 1) {
                throw ValidationException::withMessages(['order' => ['Order already fully refunded.']]);
            }

            $refundAmount = $amountCents === null ? $max : min($max, max(1, $amountCents));
            if ($refundAmount < 1) {
                throw ValidationException::withMessages(['amount' => ['Nothing left to refund.']]);
            }

            $providerRefundId = null;
            if ($payment->method === 'stripe') {
                $providerRefundId = $this->refundStripe($payment, $refundAmount, $reason);
            }

            $newRefunded = $already + $refundAmount;
            $fully = $newRefunded >= (int) $payment->amount_cents;

            $payment->update([
                'refunded_cents' => $newRefunded,
                'refund_provider_id' => $providerRefundId ?? $payment->refund_provider_id,
                'refunded_at' => now(),
                'status' => $fully ? 'refunded' : 'received',
                'note' => trim(($payment->note ? $payment->note.' | ' : '').'Refund: '.($reason ?? 'admin')),
            ]);

            if ($restock && $fully) {
                foreach ($order->items as $item) {
                    if ($item->product_id) {
                        $product = Product::query()->find($item->product_id);
                        if ($product) {
                            $this->inventory->restockFromRefund($product, $item->quantity);
                        }
                    }
                }
            }

            $invoice = $order->invoice;
            if (! $invoice) {
                throw ValidationException::withMessages(['invoice' => ['Invoice missing; cannot issue credit note.']]);
            }

            $credit = CreditNote::query()->create([
                'invoice_id' => $invoice->id,
                'order_id' => $order->id,
                'number' => 'CN-'.now()->format('Y').'-'.Str::upper(Str::random(5)),
                'amount_cents' => $refundAmount,
                'reason' => $reason ?? 'Refund',
                'issued_at' => now(),
            ]);

            if ($fully) {
                $order->update(['status' => 'refunded']);

                OrderReturn::query()
                    ->where('order_id', $order->id)
                    ->whereIn('status', ['requested', 'approved', 'returned'])
                    ->update([
                        'status' => 'refunded',
                        'handled_by' => $admin->id,
                        'handled_at' => now(),
                        'admin_note' => $reason,
                    ]);
            }

            $this->audit->log($admin, 'order.refunded', $order, [
                'amount_cents' => $refundAmount,
                'restock' => $restock && $fully,
                'full' => $fully,
                'provider_refund_id' => $providerRefundId,
            ]);

            if ($order->user) {
                $this->notify->send($order->user, 'payment_confirmed', [
                    'number' => $order->number,
                    'note' => 'Refund '.$credit->number,
                ]);
            }

            return [
                'order' => $order->fresh()->load(['items', 'payment', 'invoice', 'user']),
                'credit_note' => $credit,
                'payment' => $payment->fresh(),
            ];
        });
    }

    public function processReturn(OrderReturn $return, User $admin, string $status, ?string $note = null, bool $autoRefund = true): OrderReturn
    {
        return DB::transaction(function () use ($return, $admin, $status, $note, $autoRefund) {
            $return = OrderReturn::query()->lockForUpdate()->with('order.payment')->findOrFail($return->id);
            $order = $return->order;
            if (! $order) {
                throw ValidationException::withMessages(['return' => ['Order missing.']]);
            }

            $return->update([
                'status' => $status,
                'admin_note' => $note,
                'handled_by' => $admin->id,
                'handled_at' => now(),
            ]);

            match ($status) {
                'approved' => $order->update(['status' => 'return_requested']),
                'rejected' => $order->update(['status' => in_array($order->status, ['shipped', 'delivered'], true) ? $order->status : 'delivered']),
                'returned' => $order->update(['status' => 'returned']),
                'refunded' => null,
                default => null,
            };

            if ($status === 'refunded' && $autoRefund) {
                $this->refundOrder($order, $admin, null, $note ?? $return->reason, true);
                $return->refresh();
            }

            $this->audit->log($admin, 'return.'.$status, $return);

            return $return->fresh()->load(['order', 'user']);
        });
    }

    private function refundStripe(Payment $payment, int $amountCents, ?string $reason): ?string
    {
        if ($this->stripe->demoMode() || ! config('services.stripe.secret')) {
            return 'demo_refund_'.$payment->id.'_'.Str::lower(Str::random(6));
        }

        Stripe::setApiKey((string) config('services.stripe.secret'));

        $paymentIntent = null;
        if ($payment->provider_id && str_starts_with((string) $payment->provider_id, 'cs_')) {
            $session = Session::retrieve($payment->provider_id);
            $paymentIntent = $session->payment_intent ?? null;
        } elseif ($payment->provider_id && str_starts_with((string) $payment->provider_id, 'pi_')) {
            $paymentIntent = $payment->provider_id;
        }

        if (! $paymentIntent) {
            Log::warning('stripe.refund_missing_intent', ['payment_id' => $payment->id]);

            return 'manual_stripe_'.$payment->id;
        }

        $refund = Refund::create([
            'payment_intent' => $paymentIntent,
            'amount' => $amountCents,
            'reason' => 'requested_by_customer',
            'metadata' => [
                'order_id' => (string) $payment->order_id,
                'note' => $reason ?? '',
            ],
        ]);

        return $refund->id;
    }
}
