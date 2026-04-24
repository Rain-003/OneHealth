<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserStoreRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()->can('manage-users'); }
    public function rules(): array {
        return [
            'name' => ['required','string','max:255'],
            'email'=> ['required','email','max:255','unique:users,email'],
            'role' => ['required','in:admin,health_worker'],
            'password' => ['required','string','min:8','confirmed'],
        ];
    }
}

// app/Http/Requests/UserUpdateRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserUpdateRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()->can('manage-users'); }
    public function rules(): array {
        $userId = $this->route('user')->id ?? null;
        return [
            'name' => ['required','string','max:255'],
            'email'=> ['required','email','max:255', Rule::unique('users','email')->ignore($userId)],
            'role' => ['required','in:admin,health_worker'],
            'password' => ['nullable','string','min:8','confirmed'],
        ];
    }
}
