<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $product = $this->route('product');
        $status = $this->input('status', $product?->status ?? 'draft');
        $publishing = $status === 'published';

        return [
            'category_id' => [$publishing ? 'required' : 'sometimes', 'nullable', 'exists:categories,id'],
            'brand_id' => [$publishing ? 'required' : 'sometimes', 'nullable', 'exists:brands,id'],
            'slug' => ['sometimes', 'string', 'max:190', Rule::unique('products', 'slug')->ignore($product?->id)],
            'name' => [$publishing ? 'required' : 'sometimes', 'array'],
            'name.de' => [$publishing ? 'required' : 'nullable', 'string', 'max:255'],
            'name.en' => [$publishing ? 'required' : 'nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'array'],
            'summary.de' => ['nullable', 'string'],
            'summary.en' => ['nullable', 'string'],
            'notes' => ['nullable', 'array'],
            'notes.de' => ['nullable', 'string'],
            'notes.en' => ['nullable', 'string'],
            'part_number' => [$publishing ? 'required' : 'sometimes', 'nullable', 'string', 'max:120'],
            'model' => ['nullable', 'string', 'max:120'],
            'sku' => [$publishing ? 'required' : 'sometimes', 'nullable', 'string', 'max:120', Rule::unique('products', 'sku')->ignore($product?->id)],
            'serial' => ['nullable', 'string', 'max:120'],
            'condition' => [$publishing ? 'required' : 'sometimes', 'nullable', Rule::in(['new', 'used', 'refurbished', 'parts'])],
            'testing' => [$publishing ? 'required' : 'sometimes', 'nullable', Rule::in(['tested', 'working', 'untested', 'defective', 'partial', 'unknown'])],
            'price' => [$publishing ? 'required' : 'sometimes', 'nullable', 'numeric', 'min:0'],
            'price_cents' => ['nullable', 'integer', 'min:0'],
            'total_stock' => ['nullable', 'integer', 'min:0'],
            'reserved_auction' => ['nullable', 'integer', 'min:0'],
            'reserved_order' => ['nullable', 'integer', 'min:0'],
            'weight' => ['nullable', 'string', 'max:80'],
            'dimensions' => ['nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'allow_cart' => ['nullable', 'boolean'],
            'allow_buy_now' => ['nullable', 'boolean'],
            'allow_offer' => ['nullable', 'boolean'],
            'allow_quote' => ['nullable', 'boolean'],
            'allow_inquiry' => ['nullable', 'boolean'],
            'specs' => ['nullable', 'array'],
            'specs.*.label' => ['required_with:specs', 'array'],
            'specs.*.label.de' => ['nullable', 'string', 'max:120'],
            'specs.*.label.en' => ['nullable', 'string', 'max:120'],
            'specs.*.value' => ['required_with:specs', 'string', 'max:255'],
        ];
    }
}
