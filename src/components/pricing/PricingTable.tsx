import React from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, type LucideIcon, MinusIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function PricingTable({ className, ...props }: React.ComponentProps<'table'>) {
	return (
		<div
			data-slot="table-container"
			className="relative w-full overflow-x-auto"
		>
			<style>{`
				[data-slot="table-body"] tr {
					position: relative;
				}
				/* Horizontal faded row border */
				[data-slot="table-body"] tr::after {
					content: '';
					position: absolute;
					bottom: 0;
					left: 0;
					right: 0;
					height: 1px;
					background: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 15%, rgba(0,0,0,0.08) 85%, transparent 100%);
					pointer-events: none;
				}
				:is(.dark) [data-slot="table-body"] tr::after {
					background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.1) 15%, rgba(255,255,255,0.1) 85%, transparent 100%);
				}
				/* Vertical faded column divider */
				[data-slot="table-body"] td {
					position: relative;
				}
				[data-slot="table-body"] td::before {
					content: '';
					position: absolute;
					left: 0;
					top: 0;
					bottom: 0;
					width: 1px;
					background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.08) 15%, rgba(0,0,0,0.08) 85%, transparent 100%);
					pointer-events: none;
				}
				:is(.dark) [data-slot="table-body"] td::before {
					background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.1) 15%, rgba(255,255,255,0.1) 85%, transparent 100%);
				}
			`}</style>
			<table className={cn('w-full text-sm', className)} {...props} />
		</div>
	);
}

function PricingTableHeader({ ...props }: React.ComponentProps<'thead'>) {
	return <thead data-slot="table-header" {...props} />;
}

function PricingTableBody({
	className,
	...props
}: React.ComponentProps<'tbody'>) {
	return (
		<tbody
			data-slot="table-body"
			className={cn('', className)}
			{...props}
		/>
	);
}

function PricingTableRow({ ...props }: React.ComponentProps<'tr'>) {
	return <tr data-slot="table-row" {...props} />;
}

function PricingTableCell({
	className,
	children,
	...props
}: React.ComponentProps<'td'> & { children: boolean | string }) {
	return (
		<td
			data-slot="table-cell"
			className={cn('p-2 sm:p-4 align-middle text-xs sm:text-sm', className)}
			{...props}
		>
			{children === true ? (
				<CheckIcon aria-hidden="true" className="size-4" />
			) : children === false ? (
				<MinusIcon
					aria-hidden="true"
					className="text-muted-foreground size-4"
				/>
			) : (
				children
			)}
		</td>
	);
}

function PricingTableHead({ className, ...props }: React.ComponentProps<'th'>) {
	return (
		<th
			data-slot="table-head"
			className={cn(
				'p-2 text-left align-middle font-medium text-xs sm:text-sm',
				className,
			)}
			{...props}
		/>
	);
}

function PricingTablePlan({
	name,
	description,
	badge,
	badgeClassName,
	price,
	compareAt,
	icon: Icon,
	children,
	className,
	...props
}: React.ComponentProps<'div'> & PricingPlanType) {
	return (
		<div
			className={cn(
				'relative h-full overflow-hidden rounded-xl sm:rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-2 sm:p-3 font-normal',
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-1.5 sm:gap-2">
				<div className="flex items-center justify-center rounded-full border p-1 sm:p-1.5">
					{Icon && <Icon className="h-3 w-3" />}
				</div>
				<h3 className="text-muted-foreground font-mono text-xs sm:text-sm">{name}</h3>
				<Badge
					variant="secondary"
					className={cn(
						'ml-auto rounded-full border bg-transparent px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-normal pointer-events-none',
						badgeClassName,
					)}
				>
					{badge}
				</Badge>
			</div>

			{description && (
				<p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-left text-muted-foreground leading-relaxed">{description}</p>
			)}

			<div className="mt-3 sm:mt-4 flex items-baseline gap-1.5 sm:gap-2">
				<span className="text-2xl sm:text-3xl font-bold">{price}</span>
				{compareAt && (
					<span className="text-muted-foreground text-xs sm:text-sm line-through">
						{compareAt}
					</span>
				)}
			</div>
			<div className="relative z-10 mt-3 sm:mt-4">{children}</div>
		</div>
	);
}

type PricingPlanType = {
	name: string;
	description?: string;
	icon: LucideIcon;
	badge: string;
	badgeClassName?: string;
	price: string;
	compareAt?: string;
};

type FeatureValue = boolean | string;

type FeatureItem = {
	label: string;
	values: FeatureValue[];
};

export {
	type PricingPlanType,
	type FeatureValue,
	type FeatureItem,
	PricingTable,
	PricingTableHeader,
	PricingTableBody,
	PricingTableRow,
	PricingTableHead,
	PricingTableCell,
	PricingTablePlan,
};
