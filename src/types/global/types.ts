import { Request } from 'express';
import {
  ChangeRequestStatusEnum,
  DefaultStatusEnum,
  FilterTypeEnum,
  FormComponentsEnum,
  PermissionMethodsEnum,
  PriorityEnum,
  StatusWithArchiveEnum,
  TimePeriodEnum,
  UserRoleEnum,
  WorkLogTypeEnum,
} from './constants';

export type UserRoleType =
  | UserRoleEnum.ConstructorAdmin
  | UserRoleEnum.Omanager
  | UserRoleEnum.Executor
  | UserRoleEnum.Operator;

export type DefaultStatusType =
  | DefaultStatusEnum.Active
  | DefaultStatusEnum.InActive;

export type StatusWithArchiveType =
  | StatusWithArchiveEnum.Active
  | StatusWithArchiveEnum.Archive
  | StatusWithArchiveEnum.InActive;

export type PermissionMethodsType =
  | PermissionMethodsEnum.GET
  | PermissionMethodsEnum.POST
  | PermissionMethodsEnum.PUT
  | PermissionMethodsEnum.PATCH
  | PermissionMethodsEnum.DELETE;

export type OrganizationLimitsType = {
  executors?: number;
  operators?: number;
  o_managers?: number;
};



export interface ApiResponseType<T> {
  status: number;
  result: T | null;
  error: ApiErrorType | null;
}

export interface ApiErrorType {
  message: string;
  details?: any;
}

export interface RequestWithUser extends Request {
  user: {
    user_id: string;
    [key: string]: any;
  };
  organizationId: string;
}

export type UserFromToken = {
  _id: string;
  role: UserRoleType;
};

export type FilterType = FilterTypeEnum;

export type FormComponentsType = FormComponentsEnum;

export type PriorityType = PriorityEnum;

export type TimePeriodType = TimePeriodEnum;

export type WorkLogType = WorkLogTypeEnum;

export type ChangeRequestStatusType = ChangeRequestStatusEnum;
