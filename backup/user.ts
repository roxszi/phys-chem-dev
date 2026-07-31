/**
 * 用户模块的 Zod schema —— 前后端共享的唯一事实源。
 *
 * 设计要点：
 * 1. 服务端用 UserSchema 校验请求体 / 响应体
 * 2. 客户端 import User 类型直接用于 props / state
 * 3. 后端改字段 → 前端立即编译报错，杜绝类型漂移
 */
import { z } from "zod"

/** 角色枚举（前后端共用） */
export const UserRole = z.enum(["student", "teacher", "admin"])
export type UserRole = z.infer<typeof UserRole>

/** 创建用户的请求体（前端表单提交时直接校验） */
export const CreateUserInput = z.object({
  name: z.string().min(1, "姓名不能为空").max(50),
  email: z.string().email("邮箱格式不合法"),
  role: UserRole.default("student"),
})
export type CreateUserInput = z.infer<typeof CreateUserInput>

/** 完整的用户实体（数据库返回结构） */
export const User = z.object({
  id: z.int().positive(),
  name: z.string(),
  email: z.string(),
  role: UserRole,
  createdAt: z.iso.datetime(),
})
export type User = z.infer<typeof User>

/** API 通用响应包装 */
export const ApiResponse = <T extends z.ZodType>(data: T) =>
  z.object({
    ok: z.boolean(),
    data: data.optional(),
    error: z.string().optional(),
  })
