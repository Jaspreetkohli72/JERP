import React from 'react';
import { getStaffStats } from '@/app/actions/staff';
import StaffList from '@/components/Staff/StaffList';

export const revalidate = 60; // Revalidate every minute

export default async function StaffPage() {
    const { staffList, staffWithPay, settings } = await getStaffStats();

    return (
        <StaffList
            staffList={staffList}
            staffWithPay={staffWithPay}
            settings={settings}
        />
    );
}

