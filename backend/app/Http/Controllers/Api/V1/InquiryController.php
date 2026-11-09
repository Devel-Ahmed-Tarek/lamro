<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\InquiryResource;
use App\Models\Inquiry;
use App\Models\Product;
use App\Services\NotifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class InquiryController extends Controller
{
    public function __construct(private NotifyService $notify) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:inquiry,offer,quote,contact'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'slug' => ['nullable', 'string'],
            'auction_id' => ['nullable', 'integer', 'exists:auctions,id'],
            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'offer_amount' => ['nullable', 'numeric', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $user = $request->user() ?? Auth::guard('sanctum')->user();

        $productId = $data['product_id'] ?? null;
        if (! $productId && ! empty($data['slug'])) {
            $productId = Product::query()->where('slug', $data['slug'])->value('id');
        }

        if (! $user && empty($data['guest_email'])) {
            return response()->json([
                'message' => 'Guest email is required.',
                'errors' => ['guest_email' => ['Guest email is required.']],
            ], 422);
        }

        $inquiry = Inquiry::query()->create([
            'user_id' => $user?->id,
            'product_id' => $productId,
            'auction_id' => $data['auction_id'] ?? null,
            'type' => $data['type'],
            'status' => 'open',
            'guest_name' => $data['guest_name'] ?? null,
            'guest_email' => $data['guest_email'] ?? null,
            'offer_amount_cents' => isset($data['offer_amount']) ? (int) round($data['offer_amount'] * 100) : null,
            'quantity' => $data['quantity'] ?? null,
            'message' => $data['message'],
        ]);

        $who = $user?->email ?? ($data['guest_email'] ?? 'guest');
        $this->notify->notifyAdmins(
            'admin.inquiry',
            'New '.$data['type'],
            $who.': '.Str::limit($data['message'], 120),
            ['inquiry_id' => $inquiry->id, 'type' => $data['type']],
            '/admin/messages',
        );

        return response()->json([
            'data' => new InquiryResource($inquiry->load(['product', 'user'])),
        ], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $items = Inquiry::query()
            ->where('user_id', $request->user()->id)
            ->with(['product', 'handler'])
            ->latest()
            ->limit(100)
            ->get();

        return response()->json(['data' => InquiryResource::collection($items)]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $query = Inquiry::query()->with(['product', 'user', 'handler'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $items = $query->paginate(min(100, max(1, (int) $request->query('per_page', 40))));

        return response()->json([
            'data' => InquiryResource::collection($items->items()),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function adminReply(Request $request, Inquiry $inquiry): JsonResponse
    {
        $data = $request->validate([
            'admin_reply' => ['required', 'string', 'max:5000'],
            'status' => ['nullable', 'in:open,answered,accepted,rejected,closed'],
        ]);

        $inquiry->update([
            'admin_reply' => $data['admin_reply'],
            'status' => $data['status'] ?? 'answered',
            'handled_by' => $request->user()->id,
            'handled_at' => now(),
        ]);

        return response()->json([
            'data' => new InquiryResource($inquiry->fresh()->load(['product', 'user', 'handler'])),
        ]);
    }

    public function adminUpdateStatus(Request $request, Inquiry $inquiry): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:open,answered,accepted,rejected,closed'],
        ]);

        $inquiry->update([
            'status' => $data['status'],
            'handled_by' => $request->user()->id,
            'handled_at' => now(),
        ]);

        return response()->json([
            'data' => new InquiryResource($inquiry->fresh()->load(['product', 'user', 'handler'])),
        ]);
    }
}
