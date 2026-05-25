import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit2, Trash2, Database } from 'lucide-react';

function DataTable({ columns, data, loading, onEdit, onDelete, searchableFields = [], onView }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const safeData = Array.isArray(data) ? data : [];

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery || searchableFields.length === 0) return safeData;
    
    const query = searchQuery.toLowerCase();
    return safeData.filter(row =>
      searchableFields.some(field => {
        const value = row[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [safeData, searchQuery, searchableFields]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  // Loading state with skeleton rows
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Toolbar Skeleton */}
        {searchableFields.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-10 bg-gray-200 rounded-xl animate-pulse flex-1 max-w-sm"></div>
          </div>
        )}

        {/* Table Skeleton */}
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white sticky top-0">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      style={col.width ? { width: col.width } : {}}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      </td>
                    ))}
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        <div className="h-8 w-8 bg-gray-200 rounded-md animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!safeData || safeData.length === 0) {
    return (
      <div className="space-y-4">
        {/* Toolbar */}
        {searchableFields.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="mb-4 inline-flex items-center justify-center p-3 rounded-full bg-gray-100">
              <Database className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-700 text-sm font-semibold">No data found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        </div>
      </div>
    );
  }

  // Main table
  return (
    <div className="space-y-4">
      {/* TOOLBAR SECTION */}
      {searchableFields.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      )}

      {/* TABLE CARD */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-white sticky top-0">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    style={col.width ? { width: col.width } : {}}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((row, idx) => (
                <tr
                  key={row._id || idx}
                  className="hover:bg-gray-50 transition-colors duration-150 group"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-3 text-sm text-gray-700 align-middle"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  <td className="px-6 py-3 align-middle">
                    <div className="flex items-center gap-1 opacity-100 transition-opacity duration-150">
                      {onView && (
                        <button
                          className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => onView(row)}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => onEdit(row)}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                          onClick={() => onDelete(row._id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION SECTION */}
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{startIndex + 1}</span>
          <span className="mx-1">–</span>
          <span className="font-medium text-gray-900">{Math.min(endIndex, filteredData.length)}</span>
          <span className="mx-1">of</span>
          <span className="font-medium text-gray-900">{filteredData.length}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-all ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'border border-gray-200 text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
