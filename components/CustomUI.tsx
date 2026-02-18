import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
} from "lucide-react";

interface Option {
  name: string;
  code?: string;
  icon?: string;
}

interface CustomDropdownProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: "default" | "outline" | "ghost" | "compact";
  icon?: React.ReactNode;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  variant = "default",
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAbove, setShowAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect available space and adjust dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 300; // Approximate max height of dropdown
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // Show above if there's not enough space below but enough space above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setShowAbove(true);
      } else {
        setShowAbove(false);
      }
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.name === value);
  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getButtonStyles = () => {
    switch (variant) {
      case "outline":
        return "px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold";
      case "ghost":
        return "px-2 py-1 text-sm font-black text-primary hover:underline";
      case "compact":
        return "w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold bg-zinc-50 dark:bg-zinc-800 dark:text-white focus:bg-white dark:focus:bg-zinc-900";
      default:
        return "w-full p-4 glass rounded-2xl font-bold text-lg dark:text-white";
    }
  };

  return (
    <div
      className={`${variant === "default" && label ? "space-y-2" : ""} relative ${isOpen ? "z-[9999]" : "z-0"}`}
      ref={dropdownRef}
    >
      {label && (
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${getButtonStyles()} flex items-center justify-between transition-all hover:bg-white/40 dark:hover:bg-zinc-800/60`}
      >
        <span className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          {selectedOption ? (
            selectedOption.name
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""} ${variant === "ghost" ? "ml-1" : "ml-2"}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-[9999] w-full min-w-[200px] glass-card rounded-2xl overflow-hidden animate-slide-up shadow-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-2xl ${
            showAbove ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {options.length > 10 && (
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.code || opt.name}
                  type="button"
                  onClick={() => {
                    onChange(opt.name);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    value === opt.name
                      ? "bg-primary text-white"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {opt.icon && <span>{opt.icon}</span>}
                    {opt.name}
                  </span>
                  {value === opt.name && <Check className="w-3.5 h-3.5" />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-zinc-500 font-bold">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  label,
  value,
  onChange,
  min,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(value || new Date()));
  const [showAbove, setShowAbove] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect available space and adjust calendar position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const calendarHeight = 400; // Approximate height of calendar popup
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // Show above if there's not enough space below but enough space above
      if (spaceBelow < calendarHeight && spaceAbove > calendarHeight) {
        setShowAbove(true);
      } else {
        setShowAbove(false);
      }
    }
  }, [isOpen]);

  const daysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selected.getTimezoneOffset() * 60000;
    const localISODate = new Date(selected.getTime() - offset)
      .toISOString()
      .split("T")[0];
    onChange(localISODate);
    setIsOpen(false);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = daysInMonth(year, month);
    const startDay = startDayOfMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = min ? new Date(min) : null;
    if (minDate) minDate.setHours(0, 0, 0, 0);

    const calendarCells = [];
    for (let i = 0; i < startDay; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= days; day++) {
      const current = new Date(year, month, day);
      const isSelected =
        value ===
        new Date(current.getTime() - current.getTimezoneOffset() * 60000)
          .toISOString()
          .split("T")[0];
      const isToday = today.getTime() === current.getTime();
      const isDisabled = minDate && current < minDate;

      calendarCells.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => handleSelectDate(day)}
          className={`h-10 w-full rounded-xl text-sm font-bold transition-all ${
            isSelected
              ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
              : isDisabled
                ? "text-zinc-200 dark:text-zinc-700 cursor-not-allowed"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
          } ${isToday && !isSelected ? "text-primary border border-primary/20" : ""}`}
        >
          {day}
        </button>,
      );
    }

    return calendarCells;
  };

  return (
    <div
      className={`space-y-2 relative ${isOpen ? "z-[9999]" : "z-0"}`}
      ref={pickerRef}
    >
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 glass rounded-2xl flex items-center justify-between font-bold dark:text-white transition-all hover:bg-white/40 dark:hover:bg-zinc-800/60 group"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          <span>
            {value ? (
              new Date(value).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            ) : (
              <span className="text-zinc-400">Select Date</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-[9999] w-full sm:w-[320px] glass-card rounded-[2rem] p-6 animate-slide-up shadow-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-2xl ${
            showAbove ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h4 className="font-black tracking-tight text-zinc-900 dark:text-white">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h4>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div
                key={d}
                className="text-[10px] font-black text-zinc-400 uppercase"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
        </div>
      )}
    </div>
  );
};
