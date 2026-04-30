export interface PatientCreateDTO {
  fullName: string;
  phone?: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  diagnosis?: string;
  emergencyContact?: Record<string, unknown>;
  assignedNurseId?: string;
}

export interface PatientUpdateDTO {
  fullName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  diagnosis?: string;
  emergencyContact?: Record<string, unknown>;
  isActive?: boolean;
}

export interface PatientListQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
}
