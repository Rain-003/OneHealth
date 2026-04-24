<?php

namespace App\Http\Controllers;

use App\Models\Archive;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ArchiveController extends Controller
{
    /**
     * Restore the underlying model (currently supports user accounts)
     * and mark the archive row as restored.
     */
    public function restore(Request $request, Archive $archive)
    {
        DB::transaction(function () use ($archive) {
            // Restore user account if archive entry is for a user/account
            if (
                in_array($archive->item_type, ['user', 'account'], true) &&
                $archive->item_id
            ) {
                $user = User::withTrashed()->find($archive->item_id);

                if ($user && method_exists($user, 'trashed') && $user->trashed()) {
                    $user->restore();
                }
            }

            // Hide from active archive list
            $archive->restored_at = now();
            $archive->save();
        });

        return redirect()->route('admin.index', array_filter([
            'tab' => 'archives',
            'archive_q' => $request->input('archive_q'),
            'archive_type' => $request->input('archive_type'),
            'archive_sort' => $request->input('archive_sort'),
        ]))->with('success', 'Item restored.');
    }

    /**
     * Permanently delete the archive record only.
     * Does not affect the original underlying model.
     */
    public function destroy(Request $request, Archive $archive)
    {
        $archive->delete();

        return redirect()->route('admin.index', array_filter([
            'tab' => 'archives',
            'archive_q' => $request->input('archive_q'),
            'archive_type' => $request->input('archive_type'),
            'archive_sort' => $request->input('archive_sort'),
        ]))->with('success', 'Archive entry permanently deleted.');
    }
}