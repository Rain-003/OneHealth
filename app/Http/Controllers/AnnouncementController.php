<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $q = $request->input('q');

        $query = Announcement::query();

        if ($q) {
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', '%' . $q . '%')
                    ->orWhere('body', 'like', '%' . $q . '%');
            });
        }

        $announcements = $query
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        $activeTab = $request->input('tab');

        return Inertia::render('admin/AnnouncementTab', [
            'announcements' => $announcements,
            'filters' => [
                'q' => $q,
            ],
            'flash' => [
                'success' => $activeTab === 'announcements' ? session('success') : null,
                'error' => $activeTab === 'announcements' ? session('error') : null,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'audience' => ['nullable', 'string', 'max:255'],
            'is_pinned' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        $data['is_pinned'] = $request->boolean('is_pinned');

        if ($request->has('is_visible')) {
            $data['is_active'] = $request->boolean('is_visible');
        } elseif ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        } else {
            $data['is_active'] = true;
        }

        unset($data['is_visible']);

        Announcement::create($data);

        return redirect()->route('admin.index', array_filter([
            'tab' => 'announcements',
            'announcement_q' => $request->input('announcement_q'),
        ]))->with('success', 'Announcement created.');
    }

    public function update(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'audience' => ['nullable', 'string', 'max:255'],
            'is_pinned' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        $data['is_pinned'] = $request->boolean('is_pinned');

        if ($request->has('is_visible')) {
            $data['is_active'] = $request->boolean('is_visible');
        } elseif ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        } else {
            $data['is_active'] = $announcement->is_active;
        }

        unset($data['is_visible']);

        $announcement->update($data);

        return redirect()->route('admin.index', array_filter([
            'tab' => 'announcements',
            'announcement_q' => $request->input('announcement_q'),
        ]))->with('success', 'Announcement updated.');
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        $announcement->delete();

        return redirect()->route('admin.index', array_filter([
            'tab' => 'announcements',
            'announcement_q' => $request->input('announcement_q'),
        ]))->with('success', 'Announcement deleted.');
    }
}