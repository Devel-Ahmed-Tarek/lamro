<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function assertAvailable(Product $product, int $qty): void
    {
        if ($qty < 1) {
            throw ValidationException::withMessages(['quantity' => ['Quantity must be at least 1.']]);
        }

        if ($product->available_stock < $qty) {
            throw ValidationException::withMessages([
                'quantity' => ["Only {$product->available_stock} available."],
            ]);
        }
    }

    public function reserveForOrder(Product $product, int $qty): void
    {
        DB::transaction(function () use ($product, $qty) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $this->assertAvailable($locked, $qty);
            $locked->update([
                'reserved_order' => (int) $locked->reserved_order + $qty,
            ]);
        });
    }

    public function releaseOrderReservation(Product $product, int $qty): void
    {
        DB::transaction(function () use ($product, $qty) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $locked->update([
                'reserved_order' => max(0, (int) $locked->reserved_order - $qty),
            ]);
        });
    }

    public function commitSaleFromOrder(Product $product, int $qty): void
    {
        DB::transaction(function () use ($product, $qty) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $locked->update([
                'reserved_order' => max(0, (int) $locked->reserved_order - $qty),
                'total_stock' => max(0, (int) $locked->total_stock - $qty),
                'sold_quantity' => (int) $locked->sold_quantity + $qty,
            ]);
        });
    }

    public function restockFromRefund(Product $product, int $qty): void
    {
        DB::transaction(function () use ($product, $qty) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $locked->update([
                'total_stock' => (int) $locked->total_stock + $qty,
                'sold_quantity' => max(0, (int) $locked->sold_quantity - $qty),
            ]);
        });
    }

    public function convertAuctionReserveToOrder(Product $product, int $qty): void
    {
        DB::transaction(function () use ($product, $qty) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $locked->update([
                'reserved_auction' => max(0, (int) $locked->reserved_auction - $qty),
                'reserved_order' => (int) $locked->reserved_order + $qty,
            ]);
        });
    }

    public function reserveForAuction(Product $product, int $qty): void
    {
        DB::transaction(function () use ($product, $qty) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $this->assertAvailable($locked, $qty);
            $locked->update([
                'reserved_auction' => (int) $locked->reserved_auction + $qty,
            ]);
        });
    }

    public function releaseAuctionReservation(Product $product, int $qty): void
    {
        DB::transaction(function () use ($product, $qty) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $locked->update([
                'reserved_auction' => max(0, (int) $locked->reserved_auction - $qty),
            ]);
        });
    }

    public function adjustStock(Product $product, int $totalStock): Product
    {
        return DB::transaction(function () use ($product, $totalStock) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $min = (int) $locked->reserved_auction + (int) $locked->reserved_order;
            if ($totalStock < $min) {
                throw ValidationException::withMessages([
                    'total_stock' => ["Stock cannot be below reserved quantity ({$min})."],
                ]);
            }
            $locked->update(['total_stock' => $totalStock]);

            return $locked->fresh();
        });
    }
}
