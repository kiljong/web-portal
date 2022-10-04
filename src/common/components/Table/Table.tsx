import React from 'react';

import StaticTable from './StaticTable';
import VirtualTable from './VirtualTable';
import { TableProps } from './types';

const Table = <T,>({ virtual, ...props }: TableProps<T>): JSX.Element => {
  const TableComponent = virtual ? VirtualTable : StaticTable;

  return <TableComponent {...props} />;
};

export default Table;
