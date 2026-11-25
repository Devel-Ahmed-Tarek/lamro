<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Services\NotifyService;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReturnsController extends Controller
{
    public function __construct(
        private NotifyService $notify,
        private RefundService $refunds,
    ) {}

    public function store(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 403);
        if (! in_array($order->status, ['paid', 'processing', 'shipped', 'delivered'], true)) {
            throw ValidationException::withMessages(['order' => ['Return not allowed for this order status.']]);
        }
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:190'],
            'message' => ['nullable', 'string', 'max:5000'],
        ]);
        $ret = OrderReturn::query()->create([
            'order_id' => $order->id,
            'user_id' => $request->user()->id,
            'status' => 'requested',
            'reason' => $data['reason'],
            'message' => $data['message'] ?? null,
        ]);
        $order->update(['status' => 'return_requested']);

        $this->notify->notifyAdmins(
            'admin.return_requested',
            'Return requested',
            $request->user()->name.' requested return for '.$order->number.': '.$data['reason'],
            [
                'order_id' => $order->id,
                'return_id' => $ret->id,
                'order_number' => $order->number,
            ],
            '/admin/returns',
        );

        return response()->json(['data' => $ret], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $items = OrderReturn::query()
            ->where('user_id', $request->user()->id)
            ->with('order')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json(['data' => $items]);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json([
            'data' => OrderReturn::query()->with(['order', 'user'])->latest()->limit(100)->get(),
        ]);
    }

    public function adminUpdate(Request $request, OrderReturn $orderReturn): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected', 'returned', 'refunded'])],
            'admin_note' => ['nullable', 'string'],
            'auto_refund' => ['nullable', 'boolean'],
        ]);

        $ret = $this->refunds->processReturn(
            $orderReturn,
            $request->user(),
            $data['status'],
            $data['admin_note'] ?? null,
            $data['auto_refund'] ?? ($data['status'] === 'refunded'),
        );

        return response()->json(['data' => $ret]);
    }
}
