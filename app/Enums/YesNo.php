<?php
// app/Enums/YesNo.php
namespace App\Enums;

enum YesNo: string
{
    case OO = 'oo';
    case HINDI = 'hindi';

    /** Normalize various truthy/falsey inputs into YesNo|null */
    public static function fromLoose(null|bool|int|string $v): ?self
    {
        if ($v === null || $v === '') return null;

        $s = is_string($v) ? strtolower(trim($v)) : $v;

        // truthy
        if ($v === true || $v === 1 || $s === '1' || $s === 'true' || $s === 'yes' || $s === 'oo') {
            return self::OO;
        }
        // falsey
        if ($v === false || $v === 0 || $s === '0' || $s === 'false' || $s === 'no' || $s === 'hindi') {
            return self::HINDI;
        }
        return null;
    }
}
