<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\InvoicePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvoiceController extends Controller
{
    public function __construct(private InvoicePdfService $pdf) {}

    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::query()
            ->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))
            ->with('order')
            ->latest('issued_at')
            ->paginate(min(50, max(1, (int) $request->query('per_page', 20))));

        return response()->json([
            'data' => InvoiceResource::collection($invoices->items()),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $invoice->load('order');
        if ($invoice->order?->user_id !== $request->user()->id && ! $request->user()->can('admin.invoices')) {
            abort(403);
        }

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    public function download(Request $request, Invoice $invoice): Response
    {
        $invoice->load('order');
        if ($invoice->order?->user_id !== $request->user()->id && ! $request->user()->can('admin.invoices')) {
            abort(403);
        }

        $pdf = $this->pdf->render($invoice);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$invoice->number.'.pdf"',
        ]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $invoices = Invoice::query()
            ->with('order.user')
            ->latest('issued_at')
            ->paginate(min(100, max(1, (int) $request->query('per_page', 30))));

        return response()->json([
            'data' => InvoiceResource::collection($invoices->items()),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }
}
