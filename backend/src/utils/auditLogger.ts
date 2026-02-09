import { dbRun } from '../database/db';
import { User } from '../types';

export async function logChange(
  tableName: string,
  recordId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  user: User,
  oldValues?: any,
  newValues?: any,
  changedFields?: string[],
  ipAddress?: string
) {
  try {
    await dbRun(
      `INSERT INTO change_history 
       (table_name, record_id, action, user_id, old_values, new_values, changed_fields, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tableName,
        recordId,
        action,
        user.id,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        changedFields ? JSON.stringify(changedFields) : null,
        ipAddress || null,
      ]
    );
  } catch (error) {
    console.error('Error logging change:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

export function getChangedFields(oldValues: any, newValues: any): string[] {
  const changed: string[] = [];
  for (const key in newValues) {
    if (oldValues[key] !== newValues[key]) {
      changed.push(key);
    }
  }
  return changed;
}
