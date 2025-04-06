export default interface UserData {
    id: number;
    name: string;
    email: string;
    contactInfo: string;
    courses: string[];
    level:string;
    matricNumber: string;
    profileCompleted: boolean;
    userType: string;
    uid:string;
    createdAt: Date;
    updatedAt: Date;
}