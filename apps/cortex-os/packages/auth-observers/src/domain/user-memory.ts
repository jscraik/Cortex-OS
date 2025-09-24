export interface UserProfileMinimalData {
    userId: string;
    email: string;
    name?: string;
}

export const buildUserNote = (data: UserProfileMinimalData) => {
    const namePart = data.name ? ` name=${data.name}` : '';
    return `User onboarded: ${data.userId} email=${data.email}${namePart}`;
};
