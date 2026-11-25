<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesLocalizedCopy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    use ValidatesLocalizedCopy;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $product = $this->route('product');
        $status = $this->input('status', $product?->status ?? 'draft');
        $publishing = $status === 'published';

        return array_merge(
            [
                'category_id' => [$publishing ? 'required' : 'sometimes', 'nullable', 'exists:categories,id'],
                'brand_id' => [$publishing ? 'required' : 'sometimes', 'nullable', 'exists:brands,id'],
                'slug' => ['sometimes', 'string', 'max:190', Rule::unique('products', 'slug')->ignore($product?->id)],
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
                'specs.*.value' => ['required_with:specs', 'string', 'max:255'],
                'auto_translate' => ['nullable', 'boolean'],
                'source_locale' => ['nullable', 'string'],
            ],
            $this->localizedCopyRules('name', $publishing, 255),
            $this->localizedCopyRules('summary', false, 5000),
            $this->localizedCopyRules('notes', false, 5000),
            $this->localizedSpecLabelRules(),
        );
    }
}
