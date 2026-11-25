import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

const PREFIX = '+216 ';

/**
 * Extract up to 8 Tunisian digits from any raw string.
 * Strips any leading +216, 00216, or country code if over 8 digits.
 */
export function extractTunisianDigits(value) {
  if (!value) return '';
  let str = String(value).trim();
  
  // Strip leading +216 or 00216
  if (/^(\+216|00216)/.test(str)) {
    str = str.replace(/^(\+216|00216)/, '');
  } else {
    // If digits only and > 8 digits and starts with 216
    const allDigits = str.replace(/\D/g, '');
    if (allDigits.length > 8 && allDigits.startsWith('216')) {
      str = allDigits.slice(3);
    }
  }
  
  return str.replace(/\D/g, '').slice(0, 8);
}

/**
 * Format 8 Tunisian digits into "+216 XX XXX XXX"
 */
export function formatTunisianPhone(value, alwaysPrefix = true) {
  const digits = extractTunisianDigits(value);
  if (!digits) {
    return alwaysPrefix ? PREFIX : '';
  }
  
  let formatted = PREFIX;
  if (digits.length <= 2) {
    formatted += digits;
  } else if (digits.length <= 5) {
    formatted += `${digits.slice(0, 2)} ${digits.slice(2)}`;
  } else {
    formatted += `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
  }
  return formatted;
}

/**
 * Calculate cursor position after formatting
 */
function calculateCursorPos(formatted, digitCount) {
  if (digitCount <= 0) return PREFIX.length;
  let count = 0;
  for (let i = PREFIX.length; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count++;
      if (count === digitCount) {
        return i + 1;
      }
    }
  }
  return formatted.length;
}

/**
 * TunisianPhoneInput
 * 
 * Enforces a non-erasable "+216 " prefix followed by 8 Tunisian digits
 * formatted as "+216 XX XXX XXX" (e.g. "+216 22 222 222").
 */
const TunisianPhoneInput = forwardRef(function TunisianPhoneInput({
  value = '',
  onChange,
  onFocus,
  onBlur,
  onClick,
  placeholder = '+216 XX XXX XXX',
  className = '',
  name,
  id,
  required,
  disabled,
  readOnly,
  dir = 'ltr',
  ...rest
}, ref) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => inputRef.current);

  // Compute display value
  const digits = extractTunisianDigits(value);
  // If digits exist or value starts with +216, show full format.
  // If empty and not focused, we can show empty string to allow placeholder to show.
  const displayValue = digits
    ? formatTunisianPhone(digits)
    : (value && String(value).includes('216') ? PREFIX : (value ? formatTunisianPhone(value) : ''));

  // Helper to trigger onChange with a synthetic-like event
  const emitChange = (newFormatted) => {
    if (!onChange) return;
    const evt = {
      target: { name, value: newFormatted },
      currentTarget: { name, value: newFormatted },
      preventDefault: () => {},
      stopPropagation: () => {},
    };
    // Also support callers reading val directly
    evt.toString = () => newFormatted;
    evt.valueOf = () => newFormatted;
    onChange(evt);
  };

  // Keep cursor after prefix
  const ensureCursorPosition = (input, forcePos = null) => {
    if (!input) return;
    requestAnimationFrame(() => {
      if (forcePos !== null) {
        input.setSelectionRange(forcePos, forcePos);
        return;
      }
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (start < PREFIX.length) {
        input.setSelectionRange(PREFIX.length, Math.max(PREFIX.length, end < PREFIX.length ? PREFIX.length : end));
      }
    });
  };

  const handleFocus = (e) => {
    if (!digits && !displayValue) {
      emitChange(PREFIX);
    }
    const input = e.target;
    ensureCursorPosition(input, input.value.length || PREFIX.length);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    // If only "+216 " remains and no actual digits were typed, clear it so placeholder shows and empty submit works
    if (!digits) {
      emitChange('');
    }
    if (onBlur) onBlur(e);
  };

  const handleClick = (e) => {
    ensureCursorPosition(e.target);
    if (onClick) onClick(e);
  };

  const handleSelect = (e) => {
    const input = e.target;
    // Don't allow cursor to sit before PREFIX if collapsed
    if (input.selectionStart === input.selectionEnd && input.selectionStart < PREFIX.length) {
      input.setSelectionRange(PREFIX.length, PREFIX.length);
    }
  };

  const handleKeyDown = (e) => {
    const input = e.target;
    const { selectionStart, selectionEnd } = input;
    const currentVal = input.value || PREFIX;

    // Handle Ctrl+A / Cmd+A: select only digits after PREFIX
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      input.setSelectionRange(PREFIX.length, currentVal.length);
      return;
    }

    // Prevent backspacing into or erasing the prefix
    if (e.key === 'Backspace') {
      if (selectionStart <= PREFIX.length && selectionEnd <= PREFIX.length) {
        e.preventDefault();
        return;
      }
      
      // If cursor is right after a space in the formatted digits, delete the digit before the space
      if (selectionStart === selectionEnd && (selectionStart === 8 || selectionStart === 12)) {
        e.preventDefault();
        // Number of digits before this position is either 2 (at pos 8) or 5 (at pos 12)
        const currentDigits = extractTunisianDigits(currentVal);
        const delIndex = selectionStart === 8 ? 1 : 4; // 0-based index of digit to remove
        const newDigits = currentDigits.slice(0, delIndex) + currentDigits.slice(delIndex + 1);
        const formatted = newDigits ? formatTunisianPhone(newDigits) : PREFIX;
        emitChange(formatted);
        const newPos = calculateCursorPos(formatted, delIndex);
        ensureCursorPosition(input, newPos);
        return;
      }

      // If selection spans prefix and digits, only delete the digits
      if (selectionStart < PREFIX.length && selectionEnd > PREFIX.length) {
        e.preventDefault();
        const currentDigits = extractTunisianDigits(currentVal);
        const digitsAfterPrefix = currentVal.slice(PREFIX.length);
        const numToKeepFromEnd = currentVal.length - selectionEnd;
        const newDigits = currentDigits.slice(currentDigits.length - numToKeepFromEnd);
        const formatted = newDigits ? formatTunisianPhone(newDigits) : PREFIX;
        emitChange(formatted);
        ensureCursorPosition(input, PREFIX.length);
        return;
      }
    }

    // Prevent Delete key from deleting prefix
    if (e.key === 'Delete') {
      if (selectionStart < PREFIX.length) {
        e.preventDefault();
        if (selectionEnd <= PREFIX.length) {
          ensureCursorPosition(input, PREFIX.length);
          return;
        }
      }
    }

    // Prevent ArrowLeft from going into prefix
    if (e.key === 'ArrowLeft' && selectionStart <= PREFIX.length && selectionEnd <= PREFIX.length) {
      e.preventDefault();
      ensureCursorPosition(input, PREFIX.length);
      return;
    }

    // Prevent non-numeric characters (allow navigation, copy, paste, etc.)
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      !/\d/.test(e.key)
    ) {
      e.preventDefault();
      return;
    }

    // Limit to exactly 8 digits max
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      /\d/.test(e.key) &&
      selectionStart === selectionEnd
    ) {
      const currentDigits = extractTunisianDigits(currentVal);
      if (currentDigits.length >= 8) {
        e.preventDefault();
        return;
      }
    }
  };

  const handleChange = (e) => {
    const rawVal = e.target.value;
    const input = e.target;
    const prevCursor = input.selectionStart || PREFIX.length;
    
    // Count how many digits were before previous cursor position
    const digitsBeforeCursor = rawVal.slice(0, prevCursor).replace(/\D/g, '').replace(/^216/, '').length;

    const newDigits = extractTunisianDigits(rawVal);
    const newFormatted = newDigits ? formatTunisianPhone(newDigits) : PREFIX;
    
    emitChange(newFormatted);

    // Reposition cursor nicely after the digit just typed
    const targetDigitCount = Math.min(newDigits.length, digitsBeforeCursor);
    const nextCursor = calculateCursorPos(newFormatted, targetDigitCount);
    ensureCursorPosition(input, nextCursor);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const pastedDigits = extractTunisianDigits(pasted);
    const currentDigits = extractTunisianDigits(displayValue);
    
    // Combine existing digits or replace
    const input = e.target;
    const { selectionStart, selectionEnd } = input;
    let finalDigits = '';
    
    if (selectionStart !== selectionEnd && selectionStart >= PREFIX.length) {
      // Replaced selection
      const before = currentDigits.slice(0, calculateDigitIndex(displayValue, selectionStart));
      const after = currentDigits.slice(calculateDigitIndex(displayValue, selectionEnd));
      finalDigits = (before + pastedDigits + after).slice(0, 8);
    } else {
      finalDigits = pastedDigits.slice(0, 8) || currentDigits;
    }
    
    const formatted = finalDigits ? formatTunisianPhone(finalDigits) : PREFIX;
    emitChange(formatted);
    ensureCursorPosition(input, formatted.length);
  };

  function calculateDigitIndex(str, pos) {
    if (pos <= PREFIX.length) return 0;
    return str.slice(PREFIX.length, pos).replace(/\D/g, '').length;
  }

  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="numeric"
      name={name}
      id={id}
      value={displayValue}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      dir={dir}
      className={`font-mono text-left tracking-wider ${className}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onPaste={handlePaste}
      maxLength={15} // "+216 XX XXX XXX" has exactly 15 characters
      {...rest}
    />
  );
});

export default TunisianPhoneInput;

