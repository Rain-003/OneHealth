<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_ownership_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->cascadeOnDelete();

            // who requested to become the owner
            $table->foreignId('requested_by')
                ->constrained('users')
                ->cascadeOnDelete();

            // current owner at the time of request (nullable if patient unassigned)
            $table->foreignId('current_owner_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('message', 500)->nullable();

            $table->foreignId('responded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable();

            $table->timestamps();

            $table->index(['patient_id', 'status']);
            $table->index(['current_owner_id', 'status']);
            $table->index(['requested_by', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_ownership_requests');
    }
};
