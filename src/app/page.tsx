
"use client";

import type { ChangeEvent, DragEvent } from "react";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { JsonLTable } from "@/components/jsonl-table";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, DownloadCloud, FileJson2, Loader2, ColumnsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type JsonData = Record<string, any>;

export default function HomePage() {
  const [jsonData, setJsonData] = useState<JsonData[] | null>(null);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("edited_data.jsonl");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = (file: File) => {
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.jsonl')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .jsonl file.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setJsonData(null);
    setAllHeaders([]);
    setVisibleColumns([]);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const parsedData: JsonData[] = [];
        const headersSet = new Set<string>();
        let parseErrors = 0;

        lines.forEach((line, index) => {
          try {
            const jsonObj = JSON.parse(line);
            parsedData.push(jsonObj);
            Object.keys(jsonObj).forEach(key => headersSet.add(key));
          } catch (error) {
            parseErrors++;
          }
        });

        const newAllHeaders = Array.from(headersSet);
        setJsonData(parsedData);
        setAllHeaders(newAllHeaders);
        setVisibleColumns(newAllHeaders);
        setIsLoading(false);

        if (parseErrors > 0) {
          toast({
            title: "Parsing Issues",
            description: `${parseErrors} line(s) could not be parsed and were skipped.`,
            variant: "destructive",
          });
        } else {
           toast({
            title: "File Loaded",
            description: `${file.name} loaded successfully.`,
          });
        }
        if (parsedData.length === 0 && lines.length > 0) {
           toast({
            title: "No Valid Data",
            description: `The file ${file.name} contained lines, but none could be parsed into valid JSON objects.`,
            variant: "destructive",
          });
        } else if (parsedData.length === 0 && lines.length === 0 && text.trim() !== '') {
           toast({
            title: "Invalid File Format",
            description: `The file ${file.name} does not appear to be a valid JSONL file. It might be a single JSON object or malformed.`,
            variant: "destructive",
          });
        } else if (parsedData.length === 0 && text.trim() === '') {
           toast({
            title: "Empty File",
            description: `The file ${file.name} appears to be empty.`,
            variant: "default",
          });
        }
      } else {
        setIsLoading(false);
        toast({
          title: "Empty File Content",
          description: `The file ${file.name} is empty or could not be read.`,
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast({
        title: "File Read Error",
        description: `Could not read file ${file.name}.`,
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };


  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isLoading) {
        setIsDraggingOver(true);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
     if (!isLoading) {
        setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) {
        setIsDraggingOver(false);
    } else if (!event.relatedTarget) { 
        setIsDraggingOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    if (isLoading) {
      return;
    }

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      processFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  const handleDownload = () => {
    if (!jsonData) {
      toast({
        title: "No Data",
        description: "There is no data to download.",
        variant: "destructive",
      });
      return;
    }
    const jsonlString = jsonData.map(row => JSON.stringify(row)).join('\n');
    const blob = new Blob([jsonlString], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/.jsonl$/, '_edited.jsonl') || 'edited_data.jsonl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Download Started",
      description: `Your file ${a.download} is being downloaded.`,
    });
  };

  const handleCellUpdate = (rowIndex: number, columnKey: string, newValue: any) => {
    setJsonData(prevJsonData => {
      if (!prevJsonData) return null;
      const newJsonData = [...prevJsonData];
      const updatedRow = { ...newJsonData[rowIndex], [columnKey]: newValue };
      newJsonData[rowIndex] = updatedRow;
      return newJsonData;
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleColumnVisibilityChange = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newVisibleColumns = prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey];

      if (newVisibleColumns.length === 0 && prev.length > 0) { // Prevent hiding the last column if there was at least one
        toast({ title: "Cannot hide all columns", description: "At least one column must be visible.", variant: "destructive" });
        return prev;
      }
      return newVisibleColumns;
    });
  };

  const handleColumnDoubleClick = (columnKey: string) => {
    setVisibleColumns([columnKey]);
    toast({
      title: "Single Column Selected",
      description: `Only "${columnKey}" is now visible.`,
    });
  };


  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 selection:bg-accent selection:text-accent-foreground">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-primary">JSONline Editor</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Upload, view, edit, and download your JSONL files with ease.
        </p>
      </header>

      <main className="w-full max-w-7xl space-y-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">File Operations & View</CardTitle>
            <CardDescription>Drag & drop your JSONL file, click to browse, manage columns, or download changes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                "border-input hover:border-primary focus:border-primary",
                isDraggingOver && !isLoading ? "border-primary bg-primary/10" : "",
                isLoading ? "cursor-not-allowed opacity-70 bg-muted/50" : ""
              )}
              onClick={!isLoading ? triggerFileInput : undefined}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={isLoading ? -1 : 0}
              aria-disabled={isLoading}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") !isLoading && triggerFileInput()}}
            >
              <input
                type="file"
                accept=".jsonl"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                disabled={isLoading}
              />
              {isLoading ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3 pointer-events-none" />
                  <p className="text-lg font-medium text-muted-foreground pointer-events-none">Loading file...</p>
                  <p className="text-sm text-muted-foreground pointer-events-none">Please wait while your file is processed.</p>
                </>
              ) : (
                <>
                  <UploadCloud className={cn("h-10 w-10 mb-3 pointer-events-none", isDraggingOver ? "text-primary" : "text-muted-foreground")} />
                  <p className="text-lg font-medium text-foreground pointer-events-none">
                    {isDraggingOver ? "Drop your file here!" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-sm text-muted-foreground pointer-events-none">Supports .jsonl files only</p>
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-start items-center">
                <Button 
                    onClick={handleDownload} 
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                    disabled={!jsonData || jsonData.length === 0 || isLoading}
                >
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  Download Edited JSONL
                </Button>
                {allHeaders.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <ColumnsIcon className="mr-2 h-4 w-4" />
                        Manage Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1 text-xs text-muted-foreground border-b border-border">
                        💡 Double-click to show only this column
                      </div>
                      <ScrollArea className="h-auto max-h-[200px] md:max-h-[300px] overflow-y-auto">
                        {allHeaders.map((header) => (
                          <DropdownMenuCheckboxItem
                            key={header}
                            checked={visibleColumns.includes(header)}
                            onCheckedChange={() => handleColumnVisibilityChange(header)}
                            onSelect={(e) => e.preventDefault()}
                            onDoubleClick={() => handleColumnDoubleClick(header)}
                            className="cursor-pointer"
                          >
                            {header}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          </CardContent>
        </Card>

        {isLoading && (!jsonData || jsonData.length === 0) ? ( 
          <Card className="shadow-xl">
            <CardContent className="p-10 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-xl text-muted-foreground">Processing your file...</p>
            </CardContent>
          </Card>
        ) : jsonData && jsonData.length > 0 ? (
          <JsonLTable 
            allHeaders={allHeaders} 
            visibleColumnHeaders={visibleColumns} 
            rows={jsonData} 
            onCellChange={handleCellUpdate} 
          />
        ) : (
           jsonData && jsonData.length === 0 && allHeaders.length === 0 ? ( 
            <Card className="shadow-xl">
                <CardContent className="p-10 text-center">
                    <FileJson2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-xl text-muted-foreground">No valid data found in the uploaded file.</p>
                    <p className="text-sm text-muted-foreground mt-2">Please try uploading another .jsonl file.</p>
                </CardContent>
            </Card>
           ) : ( 
            <Card className="shadow-xl">
                <CardContent className="p-10 text-center">
                    <FileJson2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-xl text-muted-foreground">No file loaded.</p>
                    <p className="text-sm text-muted-foreground mt-2">Upload a JSONL file to get started.</p>
                </CardContent>
            </Card>
           )
        )}
      </main>
       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} JSONline Editor. All rights reserved.</p>
      </footer>
    </div>
  );
}
    

    
