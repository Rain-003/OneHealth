<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('archives', function (Blueprint $table) {
            $table->id();

            // Optional: which patient this archive is related to (if any)
            $table->foreignId('patient_id')
                ->nullable()
                ->constrained('patients')
                ->nullOnDelete();

            // Who did the archiving (admin / health worker)
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // What kind of thing was archived (for now likely "patient")
            // e.g. "patient", "patient_record", "immunization_record"
            $table->string('item_type', 100);

            // The original primary key of the item in its own table
            $table->unsignedBigInteger('item_id')->nullable();

            // A short label we can show in the UI (e.g. patient full name)
            $table->string('item_label', 255)->nullable();

            // Optional human reason/notes for the archive
            $table->text('reason')->nullable();

            // JSON snapshot of the original data (so we can see details / restore)
            $table->json('payload')->nullable();

            // When it was archived (separate from created_at for clarity)
            $table->timestamp('archived_at')->useCurrent();

            // If we ever implement restore, we can set this
            $table->timestamp('restored_at')->nullable();

            $table->timestamps();

            // Helpful indexes
            $table->index(['item_type', 'item_id']);
            $table->index(['patient_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('archives');
    }
};
