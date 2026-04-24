<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('prenatal_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();

            // short token (similar to immunization) for grouping/linking
            $table->string('token', 24)->index();

            // fields (from your Prenatal "visits" table UI)
            $table->date('visit_date')->nullable();
            $table->unsignedSmallInteger('aog_days')->nullable(); // age of gestation in days
            $table->string('bp', 20)->nullable();
            $table->decimal('wt', 6, 2)->nullable();
            $table->decimal('fh', 5, 1)->nullable();  // fundic height
            $table->unsignedSmallInteger('fhr')->nullable(); // fetal heart rate

            // checklist / extras
            $table->boolean('health_education')->nullable();
            $table->boolean('birthplan_filled')->nullable();
            $table->boolean('lab_request')->nullable();
            $table->boolean('referred')->nullable();
            $table->unsignedSmallInteger('tt_given_ml')->nullable();
            $table->unsignedSmallInteger('feso4_caps')->nullable();
            $table->boolean('advised')->nullable();

            $table->text('remarks')->nullable();

            $table->timestamps();
            $table->index(['patient_id', 'visit_date']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('prenatal_visits');
    }
};
