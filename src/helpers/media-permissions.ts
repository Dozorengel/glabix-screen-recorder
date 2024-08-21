export const getMediaPermission = async (
  permissionName: string
): Promise<PermissionState> => {
  try {
    const result = await navigator.permissions.query({
      name: permissionName as PermissionName,
    })
    return result.state
  } catch (error) {
    return "denied"
  }
}
