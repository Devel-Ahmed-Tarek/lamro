<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CmsBanner;
use App\Models\CmsPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CmsController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $page = CmsPage::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();

        return response()->json(['data' => $page]);
    }

    public function banners(): JsonResponse
    {
        return response()->json([
            'data' => CmsBanner::query()->where('is_active', true)->orderBy('sort')->get(),
        ]);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json(['data' => CmsPage::query()->orderBy('slug')->get()]);
    }

    public function adminUpdate(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'array'],
            'body' => ['sometimes', 'array'],
            'meta_title' => ['nullable', 'string'],
            'meta_description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['draft', 'published'])],
        ]);
        $cmsPage->update($data);

        return response()->json(['data' => $cmsPage->fresh()]);
    }
}
