
export type DropdownChildren = {
	id: string;
	label: string;
};

export type DropdownProps = {
	id: string;
	label: string;
	classname?: string;
	children: DropdownChildren[];
};
