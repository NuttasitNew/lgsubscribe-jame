import { Children, isValidElement, type ReactNode } from "react";

export function ReportTable({
  title,
  columns,
  children,
  empty,
}: {
  title: string;
  columns: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  const rows = Children.toArray(children).filter(isValidElement<{ children?: ReactNode }>);
  return (
    <section className="overflow-hidden rounded-xl border border-[#d4d7da] bg-white">
      <h2 className="border-b border-[#d4d7da] px-4 py-3 font-semibold">{title}</h2>
      {empty ? (
        <p className="p-4 text-sm text-[#666b70]">ยังไม่มีข้อมูลในช่วงที่เลือก</p>
      ) : (
        <>
          <ul className="divide-y divide-[#e5e7e9] sm:hidden" aria-label={title}>
            {rows.map((row, index) => {
              const cells = Children.toArray(row.props.children).filter(
                isValidElement<{ children?: ReactNode }>,
              );
              return (
                <li key={row.key ?? index} className="px-4 py-3">
                  <h3 className="break-words text-sm font-semibold">{cells[0]?.props.children}</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                    {cells.slice(1).map((cell, cellIndex) => (
                      <div key={columns[cellIndex + 1]} className="min-w-0">
                        <dt className="text-xs text-[#666b70]">{columns[cellIndex + 1]}</dt>
                        <dd className="mt-1 break-words text-sm font-medium tabular-nums">
                          {cell.props.children}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-[#f5f6f7]">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={`px-4 py-3 whitespace-nowrap ${index ? "text-right" : "text-left"}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{children}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
