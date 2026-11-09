<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => Address::query()->where('user_id', $request->user()->id)->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        if (! empty($data['is_default'])) {
            Address::query()->where('user_id', $request->user()->id)->update(['is_default' => false]);
        }
        $address = Address::query()->create([...$data, 'user_id' => $request->user()->id]);

        return response()->json(['data' => $address], 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);
        $data = $this->validated($request);
        if (! empty($data['is_default'])) {
            Address::query()->where('user_id', $request->user()->id)->update(['is_default' => false]);
        }
        $address->update($data);

        return response()->json(['data' => $address->fresh()]);
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);
        $address->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'label' => ['nullable', 'string', 'max:80'],
            'name' => ['required', 'string', 'max:190'],
            'line1' => ['required', 'string', 'max:190'],
            'line2' => ['nullable', 'string', 'max:190'],
            'city' => ['required', 'string', 'max:120'],
            'postcode' => ['required', 'string', 'max:32'],
            'country' => ['required', 'string', 'size:2'],
            'phone' => ['nullable', 'string', 'max:40'],
            'is_default' => ['nullable', 'boolean'],
        ]);
    }
}
