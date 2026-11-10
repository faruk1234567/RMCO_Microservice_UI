// Backend MenuItemResponse / MenuItemRequest er sathe hubohu mila.
export interface MenuItem {
  id: number;
  code: string;
  labelBn: string;
  labelEn: string;
  parentId?: number | null;          // null = mul (top level) menu
  routePath?: string | null;         // group menu hole khali
  icon?: string | null;
  requiredPermissionCode?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  children?: MenuItem[];
}

// POST /menus  ebong  PUT /menus/{id}  er body (MenuItemRequest)
export interface MenuRequest {
  code: string;
  labelBn: string;
  labelEn: string;
  parentId: number | null;
  routePath: string | null;
  icon: string | null;
  requiredPermissionCode: string | null;
  sortOrder: number;
  isActive: boolean;
}
