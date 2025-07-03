
"use client";

import type { ChangeEvent } from "react";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface JsonLTableProps {
  allHeaders: string[];
  visibleColumnHeaders: string[];
  rows: Record<string, any>[];
  onCellChange: (rowIndex: number, columnKey: string, newValue: any) => void;
}

const CONTENT_LENGTH_THRESHOLD = 150;
const DEFAULT_MIN_WIDTH = "min-w-[150px]";
const WIDER_MIN_WIDTH = "min-w-[400px]";

export function JsonLTable({ allHeaders, visibleColumnHeaders, rows, onCellChange }: JsonLTableProps) {
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [currentEditRowValues, setCurrentEditRowValues] = useState<Record<string, string> | null>(null);
  const { toast } = useToast();

  // Effect to handle resetting edit mode if the currently edited row becomes invalid
  // (e.g., due to data changing from elsewhere, or rows array becoming empty)
  useEffect(() => {
    if (editingRowIndex !== null && (editingRowIndex >= rows.length || rows.length === 0)) {
      setEditingRowIndex(null);
      setCurrentEditRowValues(null);
    }
  }, [rows, editingRowIndex]);

  // Effect to handle resetting edit mode when the fundamental structure of the data changes
  // (e.g., new file loaded, indicated by allHeaders changing)
  useEffect(() => {
    setEditingRowIndex(null);
    setCurrentEditRowValues(null);
  }, [allHeaders]);


  const handleEditClick = (rowIndex: number) => {
    setEditingRowIndex(rowIndex);
    const rowData = rows[rowIndex];
    const initialEditValues: Record<string, string> = {};
    allHeaders.forEach(header => {
      const value = rowData[header];
      initialEditValues[header] = (value !== null && value !== undefined && typeof value === 'object') ? JSON.stringify(value, null, 2) : String(value ?? "");
    });
    setCurrentEditRowValues(initialEditValues);
  };

  const handleSaveEdit = () => {
    if (editingRowIndex === null || !currentEditRowValues) return;

    let changesMade = false;
    allHeaders.forEach(header => {
      const stringValue = currentEditRowValues[header];
      const originalValueFromState = rows[editingRowIndex!][header];

      const originalStringValue = (originalValueFromState !== null && originalValueFromState !== undefined && typeof originalValueFromState === 'object')
        ? JSON.stringify(originalValueFromState, null, 2)
        : String(originalValueFromState ?? "");

      if (stringValue !== originalStringValue) {
        changesMade = true;
      }

      let finalValue: any = stringValue;
      try {
        const initialValueType = typeof rows[editingRowIndex!][header];
        const initialValue = rows[editingRowIndex!][header];

        if (stringValue.trim() === "") {
            // If original was explicitly null or undefined, or a primitive that becomes empty string
            if (initialValue === null) finalValue = null;
            else if (initialValue === undefined) finalValue = undefined; // Technically JSON stringify would remove undefined keys
            else if (['string', 'number', 'boolean'].includes(initialValueType)) finalValue = ""; // Keep as empty string for primitives
            else finalValue = null; // For objects/arrays, empty string usually means null for JSON
        } else if (initialValueType === 'number') {
          const num = parseFloat(stringValue);
          finalValue = isNaN(num) ? stringValue : num;
        } else if (initialValueType === 'boolean') {
          if (stringValue.toLowerCase() === 'true') finalValue = true;
          else if (stringValue.toLowerCase() === 'false') finalValue = false;
          else finalValue = stringValue; // Keep as string if not clear boolean
        } else if (initialValueType === 'object' || initialValue === null || initialValue === undefined) {
          // For objects, arrays, or if original was null/undefined
          try {
            finalValue = JSON.parse(stringValue);
          } catch (e) {
            // If JSON.parse fails, keep as string. This is important.
            finalValue = stringValue;
          }
        } else {
             finalValue = stringValue; // Default to string if no other type matches
        }
      } catch (e) {
        // This catch is for errors in accessing initialValueType or other unexpected issues
        finalValue = stringValue;
      }
      onCellChange(editingRowIndex!, header, finalValue);
    });

    if (changesMade) {
        toast({
            title: "Row Saved",
            description: `Row ${editingRowIndex + 1} has been updated.`,
            duration: 3000,
        });
    } else {
        toast({
            title: "No Changes",
            description: `No changes detected in row ${editingRowIndex + 1}.`,
            duration: 3000,
        });
    }

    setEditingRowIndex(null);
    setCurrentEditRowValues(null);
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setCurrentEditRowValues(null);
  };

  const handleCellTextChange = (columnKey: string, newTextValue: string) => {
    setCurrentEditRowValues(prev => ({
      ...prev!,
      [columnKey]: newTextValue,
    }));
  };

  if (!rows) return null;


  return (
    <div className="overflow-x-auto bg-card p-4 rounded-lg shadow-md">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumnHeaders.map((header) => (
              <TableHead key={header} className={cn("font-semibold text-primary-foreground bg-primary/90 sticky top-0 z-10", DEFAULT_MIN_WIDTH)}>
                {header}
              </TableHead>
            ))}
            {(allHeaders.length > 0 && rows.length > 0 && visibleColumnHeaders.length > 0) && (
                 <TableHead className={cn("text-right w-32 text-primary-foreground bg-primary/90 sticky top-0 z-10", DEFAULT_MIN_WIDTH)}>Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-muted/50">
              {visibleColumnHeaders.map((header) => {
                const isRowCurrentlyEditing = editingRowIndex === rowIndex;
                const cellValue = row[header];

                const displayValue = (cellValue !== null && cellValue !== undefined && typeof cellValue === 'object') ? JSON.stringify(cellValue, null, 2) : String(cellValue ?? "");
                const cellMinWidthClass = displayValue.length > CONTENT_LENGTH_THRESHOLD ? WIDER_MIN_WIDTH : DEFAULT_MIN_WIDTH;

                const isNestedObject = cellValue && typeof cellValue === 'object' && !Array.isArray(cellValue);
                const isArrayOfObjects = Array.isArray(cellValue) && cellValue.length > 0 && cellValue.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
                const isGenericArray = Array.isArray(cellValue) && !isArrayOfObjects;

                return (
                  <TableCell key={`${rowIndex}-${header}`} className={cn("align-top", cellMinWidthClass)}>
                    {isRowCurrentlyEditing && currentEditRowValues ? (
                      <Textarea
                        value={currentEditRowValues[header]}
                        onChange={(e) => handleCellTextChange(header, e.target.value)}
                        className="min-h-[80px] w-full border-accent ring-accent focus:ring-accent"
                        autoFocus={visibleColumnHeaders.indexOf(header) === 0 && allHeaders.indexOf(header) === 0}
                        rows={Math.max(3, (currentEditRowValues[header] || "").split('\n').length)}
                      />
                    ) : isArrayOfObjects ? (
                      <div>
                        {cellValue.map((obj: Record<string, any>, arrIndex: number) => (
                          <div key={arrIndex} className="mb-2 p-2 border border-border rounded-md bg-muted/20">
                            {Object.entries(obj).map(([key, val]) => (
                              <div key={key} className="py-0.5 text-xs">
                                <span className="font-semibold text-muted-foreground pr-1">{key}:</span>
                                <span className="whitespace-pre-wrap break-all">
                                  {(val !== null && val !== undefined && typeof val === 'object') ? JSON.stringify(val, null, 2) : String(val ?? 'null')}
                                </span>
                              </div>
                            ))}
                             {Object.keys(obj).length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Empty object in array</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isNestedObject ? (
                      <div className="text-sm mt-1">
                        {Object.entries(cellValue).map(([key, val]) => (
                          <div key={key} className="py-0.5 text-xs">
                            <span className="font-semibold text-muted-foreground pr-1">{key}:</span>
                            <span className="whitespace-pre-wrap break-all">
                             {(val !== null && val !== undefined && typeof val === 'object') ? JSON.stringify(val, null, 2) : String(val ?? 'null')}
                            </span>
                          </div>
                        ))}
                        {Object.keys(cellValue).length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Empty object</p>
                        )}
                      </div>
                    ) : (
                       <div className="whitespace-pre-wrap break-words max-h-60 overflow-y-auto p-1 rounded min-h-[2.5rem]">
                        {isGenericArray ? JSON.stringify(cellValue, null, 2) : displayValue}
                      </div>
                    )}
                  </TableCell>
                );
              })}
              {(allHeaders.length > 0 && rows.length > 0 && visibleColumnHeaders.length > 0) && (
                <TableCell className="align-top text-right space-y-1 md:space-y-0 md:space-x-1">
                  {editingRowIndex === rowIndex ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveEdit}
                        className="bg-green-500 hover:bg-green-600 text-white w-full md:w-auto"
                      >
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="bg-red-500 hover:bg-red-600 text-white w-full md:w-auto"
                      >
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </>
                  ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(rowIndex)}
                        className="border-primary text-primary hover:bg-primary/10 w-full md:w-auto"
                      >
                        <Edit3 className="h-4 w-4 mr-1" /> Edit Row
                      </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {rows.length === 0 && allHeaders.length > 0 && visibleColumnHeaders.length > 0 && (
        <p className="text-center text-muted-foreground py-4">The file contains column headers, but no data rows to display. This could be due to an empty file or all lines being unparsable.</p>
      )}
       {rows.length === 0 && allHeaders.length === 0 && ( // No data at all
         <p className="text-center text-muted-foreground py-4">No data to display. Upload a file or check parsing messages.</p>
       )}
       {rows.length > 0 && visibleColumnHeaders.length === 0 && allHeaders.length > 0 && (
         <p className="text-center text-muted-foreground py-4">All columns are hidden. Use the "Manage Columns" button to select columns to display.</p>
       )}
    </div>
  );
}
