interface MonthYearLabelProps {
  year: number;
  month: number;
  locale?: string;
  titleCase?: boolean;
  className?: string;
}

export const MonthYearLabel = ({
  year,
  month,
  locale = "es-CL",
  titleCase = true,
  className,
}: MonthYearLabelProps) => {
  const date = new Date(year, month);
  let monthName = date.toLocaleString(locale, { month: "long" });
  monthName = monthName.toLowerCase();
  if (titleCase) {
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }
  return <span className={className}>{`${monthName} de ${year}`}</span>;
};

export default MonthYearLabel;
