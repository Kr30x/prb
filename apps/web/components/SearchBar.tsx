"use client";

import { useState, useEffect, useCallback } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Поиск по названию или номеру...",
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce
  const debouncedOnChange = useCallback(
    (val: string) => {
      const timer = setTimeout(() => onChange(val), 400);
      return () => clearTimeout(timer);
    },
    [onChange]
  );

  useEffect(() => {
    const cleanup = debouncedOnChange(localValue);
    return cleanup;
  }, [localValue, debouncedOnChange]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}
    </div>
  );
}
