import React from 'react';

// 1. Impor SEMUA tool
import SqlFormatter from './tools/SQLNumberFormatter';
import JsonValueExtractor from './tools/JSONValueExtractor';
import DataCompare from './tools/DataCompare';
import JsonCompare from './tools/JSONCompare';
import BranchDataProcessor from './tools/BranchDataProcessor';
import ApiRequestorManager from './tools/ApiRequestorManager'; 
import FileSplitter from './tools/FileSplitter';
import SqlInjector from './tools/SqlInjector';
import JsonFormatter from './tools/JSONFormatter';
import ArchiveFileFinder from './tools/ArchiveFileFinder';
import ImageCompare from './tools/ImageCompare';
import DummyImageGenerator from './tools/DummyImageGenerator';
// Impor ulang WordingCompare
import WordingCompare from './tools/WordingCompare.jsx';
import SqlScriptGeneratorOtomatis from './tools/SqlScriptGeneratorOtomatis';
import SqlScriptGenerator from './tools/SQLScriptGenerator';
import CalculationTools from './tools/CalculationTools.jsx';
// Import SQLCompare BARU
import SqlCompare from './tools/SQLCompare'; // <--- BARU


/**
 * Mendefinisikan grup tool untuk sidebar.
 * Menambahkan properti 'path' unik untuk routing.
 */
export const toolGroups = [
  {
    title: 'Kalkulasi',
    tools: [
      { id: 'CalculationTools', path: '/kalkulasi', name: 'Kalkulasi', icon: 'fa-calculator' },
    ]
  },
  {
    title: 'JSON Tools',
    tools: [
      { id: 'JsonFormatter', path: '/json-formatter', name: 'JSON Formatter', icon: 'fa-code' },
      { id: 'JsonCompare', path: '/json-compare', name: 'JSON Compare', icon: 'fa-exchange-alt' },
      { id: 'JsonValueExtractor', path: '/json-value-extractor', name: 'JSON Value Extractor', icon: 'fa-search-dollar' },
    ]
  },
  {
    title: 'SQL & Data Tools',
    tools: [
      { id: 'DataCompare', path: '/data-compare', name: 'Data Compare', icon: 'fa-table-list' },
      { id: 'SqlCompare', path: '/sql-compare', name: 'SQL Compare', icon: 'fa-file-contract' }, // <--- BARU
      { id: 'SqlFormatter', path: '/sql-formatter', name: 'SQL Formatter', icon: 'fa-database' },
      { id: 'SqlInjector', path: '/sql-injector', name: 'SQL Injector', icon: 'fa-syringe' },
      { id: 'SqlScriptGeneratorOtomatis', path: '/sql-gen-otomatis', name: 'SQL Gen (Otomatis)', icon: 'fa-magic' },
      { id: 'ArchiveFileFinder', path: '/archive-finder', name: 'Archive Finder', icon: 'fa-file-archive' },
      { id: 'ApiRequestor', path: '/api-requestor', name: 'API Requestor', icon: 'fa-paper-plane' },
      { id: 'SqlScriptGenerator', path: '/sql-gen-manual', name: 'SQL Gen (Manual)', icon: 'fa-file-code' },
    ]
  },
  {
    title: 'File & Document Tools',
    tools: [
      { id: 'FileSplitter', path: '/file-splitter', name: 'File Splitter', icon: 'fa-file-zipper' },
      // GANTI KEMBALI
      { id: 'WordingCompare', path: '/doc-compare', name: 'PDF Compare (Visual)', icon: 'fa-file-pdf' },
      { id: 'ImageCompare', path: '/image-compare', name: 'Image Compare', icon: 'fa-images' },
      { id: 'DummyImageGenerator', path: '/dummy-file-gen', name: 'Dummy File Gen', icon: 'fa-file-image' },
      { id: 'BranchDataProcessor', path: '/branch-data-processor', name: 'Branch Data Processor', icon: 'fa-file-excel' },
    ]
  }
];

/**
 * Peta untuk mencocokkan 'id' tool dengan Komponen React-nya.
 */
export const toolComponentMap = {
  // Kalkulasi
  CalculationTools: CalculationTools,
  
  // JSON Tools
  JsonFormatter: JsonFormatter,
  JsonCompare: JsonCompare,
  JsonValueExtractor: JsonValueExtractor,

  // SQL & Data Tools
  DataCompare: DataCompare,
  SqlCompare: SqlCompare, // <--- BARU
  SqlFormatter: SqlFormatter,
  SqlInjector: SqlInjector,
  SqlScriptGeneratorOtomatis: SqlScriptGeneratorOtomatis,
  ArchiveFileFinder: ArchiveFileFinder,
  ApiRequestor: ApiRequestorManager,
  SqlScriptGenerator: SqlScriptGenerator,
  FileSplitter: FileSplitter,
  WordingCompare: WordingCompare,
  ImageCompare: ImageCompare,
  DummyImageGenerator: DummyImageGenerator,
  BranchDataProcessor: BranchDataProcessor,
};


export const allTools = toolGroups.flatMap(group => group.tools);