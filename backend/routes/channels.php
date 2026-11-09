<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('auction.{auctionId}', function () {
    return true;
});

Broadcast::channel('user.{userId}', function ($user, int $userId) {
    return (int) $user->id === $userId;
});
