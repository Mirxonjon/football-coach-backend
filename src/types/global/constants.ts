export enum UserRoleEnum {
  ConstructorAdmin = 'constructor-admin',
  Omanager = 'o-manager',
  Executor = 'executor',
  Operator = 'operator',
}

export enum DefaultStatusEnum {
  Active = 1,
  InActive = 0,
}

export enum StatusWithArchiveEnum {
  Active = 1,
  InActive = 0,
  Archive = -1,
}

export enum ChangeRequestStatusEnum {
  Penging = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}


export enum PermissionMethodsEnum {
  POST = 'POST',
  GET = 'GET',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export const IS_PUBLIC_KEY = 'isPublic';

export enum FilterTypeEnum {
  Search = 'search',
  Select = 'select',
  Boolean = 'boolean',
  Date = 'date',
}

export enum BoardOrderFunctionEnum {
  Increment = 'increment',
  Decrement = 'decrement',
}

export enum FormComponentsEnum {
  INPUT = 'input',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE = 'file',
  DATE = 'date',
}

export enum TimePeriodEnum {
  WEEK = 'week',
  MONTH = 'month',
}

export enum PriorityEnum {
  LOWEST = 'lowest',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  HIGHEST = 'highest',
}

export enum WorkLogTypeEnum {
  STATUS = 'status',
  ASSIGNED = 'assigned',
  DOCUMENT = 'document',
  IS_FLAGGED = 'is_flagged',
  LABEL = 'label',
  REASSIGNMENT_REQUEST = 'reassignment_request',
  PRIORITY = 'priority',
  TITLE = 'title',
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}


export enum StatusConstantNames{
  Done = "done",
  ToDo = "to_do",
  InProgress = "in_progress",
}