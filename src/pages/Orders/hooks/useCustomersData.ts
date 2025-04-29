import { useState, useCallback } from 'react';
import type { Customer } from '../types';

const ITEMS_PER_PAGE = 10;

export function useCustomersData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'email' | 'phone' | 'orders_count'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filterCustomers = useCallback((customers: Customer[]): Customer[] => {
    if (!searchTerm.trim()) return customers;
    
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      (customer.phone && customer.phone.includes(term))
    );
  }, [searchTerm]);

  const sortCustomers = useCallback((customers: Customer[]): Customer[] => {
    return [...customers].sort((a, b) => {
      let valueA, valueB;
      
      // Get the values to compare based on the sort field
      switch (sortField) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'email':
          valueA = a.email.toLowerCase();
          valueB = b.email.toLowerCase();
          break;
        case 'phone':
          valueA = a.phone || '';
          valueB = b.phone || '';
          break;
        case 'orders_count':
          valueA = a.orders_count;
          valueB = b.orders_count;
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      // Compare the values based on sort direction
      if (sortDirection === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  }, [sortField, sortDirection]);

  const filteredCustomers = filterCustomers(customers);
  const sortedCustomers = sortCustomers(filteredCustomers);
  const totalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE);
  
  const paginatedCustomers = useCallback((): Customer[] => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedCustomers, currentPage]);

  return {
    customers: {
      data: customers,
      filteredData: filteredCustomers,
      sortedData: sortedCustomers,
      paginatedData: paginatedCustomers(),
      totalPages,
      currentPage,
      setCurrentPage,
      searchTerm,
      setSearchTerm,
      sortField,
      setSortField,
      sortDirection,
      setSortDirection
    },
    setCustomers
  };
}