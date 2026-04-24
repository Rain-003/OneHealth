<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'body',
        'audience',
        'is_pinned',
        'is_active',
        'published_at',
    ];

    protected $casts = [
        'is_pinned'   => 'boolean',
        'is_active'   => 'boolean',
        'published_at'=> 'datetime',
    ];

    public function scopeFilter($query, array $filters)
    {
        // 🔍 Search in title/body
        $query->when($filters['q'] ?? null, function ($q, $search) {
            $q->where(function ($inner) use ($search) {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        });

        // 🎯 Filter by status = published/draft (mapped to is_active)
        $query->when($filters['status'] ?? null, function ($q, $status) {
            if ($status === 'published') {
                $q->where('is_active', true);
            } elseif ($status === 'draft') {
                $q->where('is_active', false);
            }
        });

        // 👥 Optional audience filter (e.g. "patients", "health_workers", "all")
        $query->when($filters['audience'] ?? null, function ($q, $audience) {
            $q->where('audience', $audience);
        });

        // 📌 Optional pinned-only filter (any truthy value)
        $query->when($filters['pinned'] ?? null, function ($q, $pinned) {
            if ($pinned) {
                $q->where('is_pinned', true);
            }
        });
    }
}
