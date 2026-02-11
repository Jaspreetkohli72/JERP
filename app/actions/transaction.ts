'use server';

import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Define the schema for transaction validation
const TransactionSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    type: z.enum(['income', 'expense']),
    category_id: z.number().nullable().optional(),
    description: z.string().min(1, 'Description is required'),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    contact_id: z.number().nullable().optional(),
    wallet_id: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    is_debt: z.boolean().default(false),
});

export type TransactionState = {
    success?: boolean;
    error?: string;
    errors?: {
        [key: string]: string[];
    };
};

export async function addTransaction(prevState: TransactionState, formData: FormData): Promise<TransactionState> {
    // Extract data from FormData
    const rawData = {
        amount: Number(formData.get('amount')),
        type: formData.get('type'),
        category_id: formData.get('category_id') ? Number(formData.get('category_id')) : null,
        description: formData.get('description'),
        transaction_date: formData.get('transaction_date'),
        contact_id: formData.get('contact_id') ? Number(formData.get('contact_id')) : null,
        wallet_id: formData.get('wallet_id') ? Number(formData.get('wallet_id')) : null,
        project_id: formData.get('project_id') ? Number(formData.get('project_id')) : null,
        is_debt: formData.get('is_debt') === 'true',
    };

    // Validate fields
    const validatedFields = TransactionSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            error: 'Missing Fields. Failed to Create Transaction.',
        };
    }

    const { data: validData } = validatedFields;

    try {
        // 1. Insert Transaction
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert([validData])
            .select()
            .single();

        if (txError) {
            console.error('Database Error:', txError);
            return { success: false, error: 'Database Error: Failed to Create Transaction.' };
        }

        // 2. Update Wallet Balance (if wallet selected)
        if (validData.wallet_id) {
            // Fetch current balance
            const { data: wallet, error: walletFetchError } = await supabase
                .from('wallets')
                .select('balance')
                .eq('id', validData.wallet_id)
                .single();

            if (walletFetchError) {
                console.error('Wallet Fetch Error:', walletFetchError);
                // Note: Transaction was created, but wallet update failed. 
                // ideally we should use a transaction or rollback, but Supabase HTTP api doesn't support complex transactions easily without RPC.
                // For now, we log it.
            } else if (wallet) {
                const newBalance = validData.type === 'income'
                    ? Number(wallet.balance) + validData.amount
                    : Number(wallet.balance) - validData.amount;

                const { error: walletUpdateError } = await supabase
                    .from('wallets')
                    .update({ balance: newBalance })
                    .eq('id', validData.wallet_id);

                if (walletUpdateError) {
                    console.error('Wallet Update Error:', walletUpdateError);
                }
            }
        }

        // 3. Revalidate Cache
        revalidatePath('/');
        revalidatePath('/transactions');

        return { success: true };
    } catch (error) {
        console.error('Server Action Error:', error);
        return { success: false, error: 'Failed to create transaction.' };
    }
}
