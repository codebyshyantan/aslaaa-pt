type PostgresErrorLike = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
};

function getConstraintName(error: PostgresErrorLike) {
  return error.constraint_name ?? error.constraint ?? null;
}

export function isPostgresUniqueViolation(error: unknown, constraintNames?: string[]) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const postgresError = error as PostgresErrorLike;

  if (postgresError.code !== "23505") {
    return false;
  }

  if (!constraintNames || constraintNames.length === 0) {
    return true;
  }

  const constraintName = getConstraintName(postgresError);
  return constraintName ? constraintNames.includes(constraintName) : false;
}
