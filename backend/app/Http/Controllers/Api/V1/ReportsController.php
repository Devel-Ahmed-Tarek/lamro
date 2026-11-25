<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ReportsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'orders_total' => Order::query()->count(),
                'orders_paid' => Order::query()->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->count(),
                'revenue_cents' => (int) Order::query()->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total_cents'),
                'invoices' => Invoice::query()->count(),
                'open_inquiries' => Inquiry::query()->where('status', 'open')->count(),
                'customers' => User::query()->role('customer')->count(),
                'sales_split' => [
                    'store' => (int) Order::query()->where('source', 'store')->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total_cents'),
                    'auction' => (int) Order::query()->where('source', 'auction')->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total_cents'),
                ],
            ],
        ]);
    }

    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $orders = Order::query()->with('user')->latest()->limit(500)->get();

        return response()->streamDownload(function () use ($orders) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['number', 'source', 'status', 'total', 'email', 'created_at']);
            foreach ($orders as $order) {
                fputcsv($out, [
                    $order->number,
                    $order->source,
                    $order->status,
                    $order->total,
                    $order->user?->email,
                    $order->created_at,
                ]);
            }
            fclose($out);
        }, 'jala-orders.csv', ['Content-Type' => 'text/csv']);
    }
}
