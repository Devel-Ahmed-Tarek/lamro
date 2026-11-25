<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyStockListingResource;
use App\Models\CompanyStockListing;
use App\Services\NotifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CompanyStockListingController extends Controller
{
    public function __construct(private NotifyService $notify) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:190'],
            'contact_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['required', 'string', 'max:40'],
            'city' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:80'],
            'inventory_type' => ['nullable', 'string', 'max:190'],
            'description' => ['required', 'string', 'max:8000'],
            'photos' => ['nullable', 'array', 'max:8'],
            'photos.*' => ['file', 'image', 'max:8192'],
        ]);

        $user = $request->user() ?? Auth::guard('sanctum')->user();

        $listing = CompanyStockListing::query()->create([
            'user_id' => $user?->id,
            'company_name' => $data['company_name'],
            'contact_name' => $data['contact_name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'city' => $data['city'] ?? null,
            'country' => $data['country'] ?? null,
            'inventory_type' => $data['inventory_type'] ?? null,
            'description' => $data['description'],
            'photos' => [],
            'status' => 'new',
        ]);

        $paths = [];
        foreach ($request->file('photos', []) as $file) {
            $paths[] = $file->store("company-stock/{$listing->id}", 'public');
        }
        if ($paths !== []) {
            $listing->update(['photos' => $paths]);
        }

        $this->notify->notifyAdmins(
            'admin.company_stock',
            'New company stock listing',
            $listing->company_name.': '.Str::limit($listing->description, 120),
            ['listing_id' => $listing->id],
            '/admin/company-stock',
        );

        return response()->json([
            'data' => new CompanyStockListingResource($listing->fresh()),
        ], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $query = CompanyStockListing::query()->with(['user', 'handler'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $items = $query->paginate(min(100, max(1, (int) $request->query('per_page', 40))));

        return response()->json([
            'data' => CompanyStockListingResource::collection($items->items()),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function adminUpdate(Request $request, CompanyStockListing $listing): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['new', 'contacted', 'closed'])],
            'admin_note' => ['nullable', 'string', 'max:5000'],
        ]);

        if (array_key_exists('status', $data) || array_key_exists('admin_note', $data)) {
            $data['handled_by'] = $request->user()->id;
            $data['handled_at'] = now();
        }

        $listing->update($data);

        return response()->json([
            'data' => new CompanyStockListingResource($listing->fresh()->load(['user', 'handler'])),
        ]);
    }

    public function adminDestroy(CompanyStockListing $listing): JsonResponse
    {
        foreach ($listing->photos ?? [] as $path) {
            Storage::disk('public')->delete($path);
        }
        $listing->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function adminBulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:company_stock_listings,id'],
        ]);

        $listings = CompanyStockListing::query()->whereIn('id', $data['ids'])->get();
        foreach ($listings as $listing) {
            foreach ($listing->photos ?? [] as $path) {
                Storage::disk('public')->delete($path);
            }
            $listing->delete();
        }

        return response()->json(['data' => ['ok' => true, 'count' => $listings->count()]]);
    }
}
