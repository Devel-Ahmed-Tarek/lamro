<?php

namespace App\Services;

use App\Models\Auction;
use App\Models\Cart;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ShippingMethod;
use App\Models\TaxSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private InventoryService $inventory,
        private PricingService $pricing,
        private AuditLogger $audit,
        private NotifyService $notify,
    ) {}

    public function cartFor(User $user): Cart
    {
        return Cart::query()->firstOrCreate(['user_id' => $user->id]);
    }

    public function upsertCartItem(User $user, Product $product, int $quantity): Cart
    {
        if ($product->status !== 'published' || ! $product->allow_cart) {
            throw ValidationException::withMessages(['product' => ['Product cannot be added to cart.']]);
        }

        $cart = $this->cartFor($user);

        if ($quantity <= 0) {
            $cart->items()->where('product_id', $product->id)->delete();

            return $cart->fresh()->load('items.product.brand');
        }

        $this->inventory->assertAvailable($product, $quantity);

        $cart->items()->updateOrCreate(
            ['product_id' => $product->id],
            ['quantity' => $quantity],
        );

        return $cart->fresh()->load('items.product.brand');
    }

    public function applyCoupon(User $user, ?string $code): Cart
    {
        $cart = $this->cartFor($user)->load('items.product');
        if ($code === null || $code === '') {
            $cart->update(['coupon_code' => null]);

            return $cart->fresh()->load('items.product.brand');
        }

        $lines = $cart->items->map(fn ($item) => (object) [
            'quantity' => $item->quantity,
            'price_cents' => $item->product?->price_cents ?? 0,
        ]);
        $subtotal = (int) $lines->sum(fn ($line) => $line->price_cents * $line->quantity);
        $this->pricing->resolveCoupon($code, $user, $subtotal);
        $cart->update(['coupon_code' => strtoupper($code)]);

        return $cart->fresh()->load('items.product.brand');
    }

    /** @param  array<string, mixed>  $shipping */
    public function checkoutCart(User $user, array $shipping = []): Order
    {
        $cart = $this->cartFor($user)->load('items.product');
        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => ['Cart is empty.']]);
        }

        return DB::transaction(function () use ($user, $cart, $shipping) {
            $lines = [];
            $priceLines = collect();
            $subtotal = 0;
            foreach ($cart->items as $item) {
                $product = Product::query()->lockForUpdate()->findOrFail($item->product_id);
                $this->inventory->assertAvailable($product, $item->quantity);
                $line = $product->price_cents * $item->quantity;
                $subtotal += $line;
                $lines[] = compact('product', 'item', 'line');
                $priceLines->push((object) ['quantity' => $item->quantity, 'price_cents' => $product->price_cents]);
            }

            $discount = $this->pricing->discounts($priceLines, $cart->coupon_code, $user);
            $shippingMethod = null;
            $shippingCents = 0;
            if (! empty($shipping['shipping_method_id'])) {
                $shippingMethod = ShippingMethod::query()->where('is_active', true)->findOrFail($shipping['shipping_method_id']);
                $shippingCents = (int) $shippingMethod->price_cents;
            }

            $taxable = max(0, $subtotal - $discount['discount_cents'] + $shippingCents);
            $tax = TaxSetting::current();
            $taxCents = (int) round($taxable * $tax->rate_bps / 10000);
            $total = $taxable + $taxCents;

            $order = Order::query()->create([
                'number' => $this->nextOrderNumber(),
                'user_id' => $user->id,
                'source' => 'store',
                'status' => 'pending_payment',
                'subtotal_cents' => $subtotal,
                'discount_cents' => $discount['discount_cents'],
                'shipping_cents' => $shippingCents,
                'coupon_code' => $discount['coupon']?->code ?? $cart->coupon_code,
                'shipping_method_id' => $shippingMethod?->id,
                'tax_cents' => $taxCents,
                'total_cents' => $total,
                'tax_rate_bps' => $tax->rate_bps,
                'currency' => $tax->currency,
                'shipping_name' => $shipping['shipping_name'] ?? $user->name,
                'shipping_line1' => $shipping['shipping_line1'] ?? null,
                'shipping_city' => $shipping['shipping_city'] ?? null,
                'shipping_postcode' => $shipping['shipping_postcode'] ?? null,
                'shipping_country' => $shipping['shipping_country'] ?? 'DE',
                'notes' => $shipping['notes'] ?? null,
            ]);

            foreach ($lines as $row) {
                /** @var Product $product */
                $product = $row['product'];
                $item = $row['item'];
                $order->items()->create([
                    'product_id' => $product->id,
                    'sku' => $product->sku,
                    'part_number' => $product->part_number,
                    'name' => $product->name,
                    'unit_price_cents' => $product->price_cents,
                    'quantity' => $item->quantity,
                    'line_total_cents' => $row['line'],
                ]);
                $this->inventory->reserveForOrder($product, $item->quantity);
            }

            $method = ($shipping['payment_method'] ?? 'bank_transfer') === 'stripe' ? 'stripe' : 'bank_transfer';

            Payment::query()->create([
                'order_id' => $order->id,
                'method' => $method,
                'status' => 'pending',
                'amount_cents' => $order->total_cents,
                'currency' => $order->currency,
                'reference' => $order->number,
            ]);

            if ($discount['coupon']) {
                $discount['coupon']->increment('used_count');
            }

            $cart->items()->delete();
            $cart->update(['coupon_code' => null]);

            $this->audit->log($user, 'order.created', $order);
            $this->notify->send($user, 'order_created', ['number' => $order->number]);
            $this->notify->notifyAdmins(
                'admin.order_created',
                'New order',
                $user->name.' placed order '.$order->number.' ('.number_format($order->total_cents / 100, 2).' '.$order->currency.')',
                [
                    'order_id' => $order->id,
                    'order_number' => $order->number,
                    'user_id' => $user->id,
                    'total_cents' => $order->total_cents,
                ],
                '/admin/orders',
            );

            $order = $order->fresh()->load(['items', 'payment', 'invoice']);

            return $order;
        });
    }

    public function checkoutAuctionWin(User $user, Auction $auction, array $shipping = []): Order
    {
        if ($auction->status !== 'ended' || $auction->winner_user_id !== $user->id) {
            throw ValidationException::withMessages(['auction' => ['You are not the winner of this auction.']]);
        }
        if ($auction->winner_order_id) {
            return Order::query()->with(['items', 'payment', 'invoice'])->findOrFail($auction->winner_order_id);
        }
        if (! $auction->product) {
            throw ValidationException::withMessages(['auction' => ['Auction product missing.']]);
        }

        return DB::transaction(function () use ($user, $auction, $shipping) {
            $product = Product::query()->lockForUpdate()->findOrFail($auction->product_id);
            $qty = max(1, (int) $auction->quantity);
            $unit = (int) $auction->current_price_cents;
            $subtotal = $unit * $qty;
            $shippingMethod = null;
            $shippingCents = 0;
            if (! empty($shipping['shipping_method_id'])) {
                $shippingMethod = ShippingMethod::query()->where('is_active', true)->findOrFail($shipping['shipping_method_id']);
                $shippingCents = (int) $shippingMethod->price_cents;
            }
            $tax = TaxSetting::current();
            $taxable = $subtotal + $shippingCents;
            $taxCents = (int) round($taxable * $tax->rate_bps / 10000);

            $order = Order::query()->create([
                'number' => $this->nextOrderNumber(),
                'user_id' => $user->id,
                'auction_id' => $auction->id,
                'source' => 'auction',
                'status' => 'pending_payment',
                'subtotal_cents' => $subtotal,
                'discount_cents' => 0,
                'shipping_cents' => $shippingCents,
                'shipping_method_id' => $shippingMethod?->id,
                'tax_cents' => $taxCents,
                'total_cents' => $taxable + $taxCents,
                'tax_rate_bps' => $tax->rate_bps,
                'currency' => $tax->currency,
                'shipping_name' => $shipping['shipping_name'] ?? $user->name,
                'shipping_line1' => $shipping['shipping_line1'] ?? null,
                'shipping_city' => $shipping['shipping_city'] ?? null,
                'shipping_postcode' => $shipping['shipping_postcode'] ?? null,
                'shipping_country' => $shipping['shipping_country'] ?? 'DE',
                'notes' => $shipping['notes'] ?? null,
            ]);

            $order->items()->create([
                'product_id' => $product->id,
                'sku' => $product->sku,
                'part_number' => $product->part_number,
                'name' => $product->name,
                'unit_price_cents' => $unit,
                'quantity' => $qty,
                'line_total_cents' => $subtotal,
            ]);

            $this->inventory->convertAuctionReserveToOrder($product, $qty);

            $method = ($shipping['payment_method'] ?? 'bank_transfer') === 'stripe' ? 'stripe' : 'bank_transfer';

            Payment::query()->create([
                'order_id' => $order->id,
                'method' => $method,
                'status' => 'pending',
                'amount_cents' => $order->total_cents,
                'currency' => $order->currency,
                'reference' => $order->number,
            ]);

            $auction->update(['winner_order_id' => $order->id]);
            $this->audit->log($user, 'auction.checkout', $order);
            $this->notify->send($user, 'auction_won', ['number' => $order->number]);
            $this->notify->notifyAdmins(
                'admin.auction_order',
                'Auction checkout',
                $user->name.' checked out auction win → order '.$order->number,
                [
                    'order_id' => $order->id,
                    'order_number' => $order->number,
                    'auction_id' => $auction->id,
                    'user_id' => $user->id,
                ],
                '/admin/orders',
            );

            return $order->fresh()->load(['items', 'payment', 'invoice']);
        });
    }

    public function cancelOrder(Order $order, User $actor): Order
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = Order::query()->lockForUpdate()->with('items', 'payment')->findOrFail($order->id);
            if (in_array($order->status, ['shipped', 'delivered', 'cancelled', 'returned', 'refunded'], true)) {
                throw ValidationException::withMessages(['status' => ['Order cannot be cancelled in this status.']]);
            }

            if ($order->payment && $order->payment->status === 'received') {
                throw ValidationException::withMessages(['status' => ['Paid orders need a refund flow.']]);
            }

            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $product = Product::query()->find($item->product_id);
                    if ($product) {
                        $this->inventory->releaseOrderReservation($product, $item->quantity);
                    }
                }
            }

            if ($order->payment && $order->payment->status === 'pending') {
                $order->payment->update(['status' => 'failed', 'note' => 'Cancelled by user/admin']);
            }

            $order->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);

            $this->audit->log($actor, 'order.cancelled', $order);

            return $order->fresh()->load(['items', 'payment', 'invoice']);
        });
    }

    public function markPaymentReceived(Payment $payment, User $admin, ?string $note = null): Order
    {
        return DB::transaction(function () use ($payment, $admin, $note) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $order = Order::query()->lockForUpdate()->with('items')->findOrFail($payment->order_id);

            if ($payment->status === 'received') {
                return $order->fresh()->load(['items', 'payment', 'invoice']);
            }

            $payment->update([
                'status' => 'received',
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'note' => $note,
            ]);

            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $product = Product::query()->find($item->product_id);
                    if ($product) {
                        $this->inventory->commitSaleFromOrder($product, $item->quantity);
                    }
                }
            }

            $order->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            $invoice = $this->ensureInvoice($order->fresh()->load('items', 'user'));
            $this->audit->log($admin, 'payment.received', $payment);
            if ($order->user) {
                $this->notify->send($order->user, 'payment_confirmed', ['number' => $order->number]);
                $this->notify->send($order->user, 'invoice_issued', ['number' => $invoice->number]);
            }

            return $order->fresh()->load(['items', 'payment', 'invoice']);
        });
    }

    public function markPaymentFailed(Payment $payment, User $admin, ?string $note = null): Order
    {
        return DB::transaction(function () use ($payment, $admin, $note) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $order = Order::query()->lockForUpdate()->with('items')->findOrFail($payment->order_id);

            $payment->update([
                'status' => 'failed',
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'note' => $note,
            ]);

            if ($order->status === 'pending_payment') {
                foreach ($order->items as $item) {
                    if ($item->product_id) {
                        $product = Product::query()->find($item->product_id);
                        if ($product) {
                            $this->inventory->releaseOrderReservation($product, $item->quantity);
                        }
                    }
                }
                $order->update(['status' => 'cancelled', 'cancelled_at' => now()]);
            }

            $this->audit->log($admin, 'payment.failed', $payment);

            return $order->fresh()->load(['items', 'payment', 'invoice']);
        });
    }

    public function ensureInvoice(Order $order): Invoice
    {
        if ($order->invoice) {
            return $order->invoice;
        }

        $tax = TaxSetting::current();

        return Invoice::query()->create([
            'order_id' => $order->id,
            'number' => $this->nextInvoiceNumber(),
            'subtotal_cents' => max(0, $order->subtotal_cents - ($order->discount_cents ?? 0)),
            'tax_cents' => $order->tax_cents,
            'total_cents' => $order->total_cents,
            'tax_rate_bps' => $order->tax_rate_bps,
            'issued_at' => now(),
            'snapshot' => [
                'order_number' => $order->number,
                'customer' => [
                    'name' => $order->user?->name ?? $order->guest_name,
                    'email' => $order->user?->email ?? $order->guest_email,
                    'company' => $order->user?->company_name,
                    'vat_id' => $order->user?->vat_id,
                ],
                'shipping' => [
                    'name' => $order->shipping_name,
                    'line1' => $order->shipping_line1,
                    'city' => $order->shipping_city,
                    'postcode' => $order->shipping_postcode,
                    'country' => $order->shipping_country,
                    'cost' => round(($order->shipping_cents ?? 0) / 100, 2),
                ],
                'discount' => round(($order->discount_cents ?? 0) / 100, 2),
                'coupon_code' => $order->coupon_code,
                'seller' => [
                    'name' => $tax->company_name,
                    'address' => $tax->company_address,
                    'vat_id' => $tax->vat_id,
                    'iban' => $tax->bank_iban,
                    'bic' => $tax->bank_bic,
                    'bank' => $tax->bank_name,
                ],
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->name,
                    'sku' => $item->sku,
                    'part_number' => $item->part_number,
                    'qty' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ])->all(),
                'tax_rate' => $order->tax_rate_bps / 100,
                'subtotal' => $order->subtotal,
                'tax' => $order->tax,
                'total' => $order->total,
                'currency' => $order->currency,
            ],
        ]);
    }

    private function nextOrderNumber(): string
    {
        return 'JALA-'.now()->format('ymd').'-'.Str::upper(Str::random(5));
    }

    private function nextInvoiceNumber(): string
    {
        $seq = Invoice::query()->count() + 1;

        return 'INV-'.now()->format('Y').'-'.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
