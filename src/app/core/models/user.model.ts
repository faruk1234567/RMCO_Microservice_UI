export interface AppUser {
  id: string;
  municipalityId: string | null;
  mobileNormalized: string;
  emailNormalized?: string;
  nameBn: string;
  nameEn?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  roles: string[];
  scopes?: string[];
  formLanguage?: 'BN' | 'EN';
  entryLanguage?: 'BN' | 'EN';
}

export interface LoginRequest {
  loginId: string; // mobile or email
  password: string;
  municipalityId?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: AppUser;
  municipalities?: { id: string; nameBn: string; nameEn: string }[];
}

export interface RegisterStepMobile {
  municipalityId: string;
  mobile: string;
}

export interface RegisterStepOtp {
  municipalityId: string;
  mobile: string;
  otp: string;
  purpose: 'REGISTRATION' | 'PASSWORD_RESET';
}

export interface RegisterSubmit {
  municipalityId: string;
  mobile: string;
  otpToken: string; // from verify step
  password: string;
  nameBn: string;
  nameEn?: string;
  email?: string;
  fatherNameBn?: string;
  fatherNameEn?: string;
  motherNameBn?: string;
  motherNameEn?: string;
  hasSpouse?: boolean;
  spouseNameBn?: string;
  spouseNameEn?: string;
  dateOfBirth?: string;
  genderId?: string;
  nid?: string;
  birthReg?: string;
  currentAddress?: AddressDto;
  permanentAddress?: AddressDto;
}

export interface AddressDto {
  unionId?: string;
  postOfficeId?: string;
  roadBn?: string;
  roadEn?: string;
  holdingNo?: string;
}

export interface Municipality {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  formLanguage: 'BN' | 'EN';
  selfRegistrationEnabled: boolean;
}
