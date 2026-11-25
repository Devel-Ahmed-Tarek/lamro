<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TaxSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => TaxSetting::current()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rate_bps' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'company_name' => ['sometimes', 'string'],
            'company_address' => ['nullable', 'string'],
            'vat_id' => ['nullable', 'string'],
            'bank_iban' => ['nullable', 'string'],
            'bank_bic' => ['nullable', 'string'],
            'bank_name' => ['nullable', 'string'],
        ]);
        $tax = TaxSetting::current();
        $tax->update($data);
        $this->audit->log($request->user(), 'tax.updated', $tax);

        return response()->json(['data' => $tax->fresh()]);
    }
}
