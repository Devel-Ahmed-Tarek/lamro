<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\CompanyStockListing */
class CompanyStockListingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_name' => $this->company_name,
            'contact_name' => $this->contact_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'city' => $this->city,
            'country' => $this->country,
            'inventory_type' => $this->inventory_type,
            'description' => $this->description,
            'photos' => $this->photoUrls(),
            'status' => $this->status,
            'admin_note' => $this->admin_note,
            'handled_by' => $this->handled_by,
            'handled_at' => $this->handled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            'handler' => $this->whenLoaded('handler', fn () => $this->handler ? [
                'id' => $this->handler->id,
                'name' => $this->handler->name,
                'email' => $this->handler->email,
            ] : null),
        ];
    }
}
