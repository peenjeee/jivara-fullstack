export interface NurseCreateDTO {
  organizationId?: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  gender?: string;
  address?: string;
  age?: number;
  employeeId?: string;
  department?: string;
}

export interface NurseUpdateDTO {
  fullName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  address?: string;
  age?: number;
  employeeId?: string;
  department?: string;
  isActive?: boolean;
}

export interface NurseListQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: "active" | "inactive" | "all";
  department?: string;
}
