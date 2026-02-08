"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [projects, setProjects] = useState([]);
    const [allGlobalBudgets, setAllGlobalBudgets] = useState([]);
    const [allCategoryBudgets, setAllCategoryBudgets] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [workLogs, setWorkLogs] = useState([]);
    const [stickyNotes, setStickyNotes] = useState([]);
    const [clientQueries, setClientQueries] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [allStaffAdvances, setAllStaffAdvances] = useState([]);
    const [bills, setBills] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [shoppingList, setShoppingList] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    const TABLES = {
        TRANSACTIONS: 'transactions',
        CATEGORIES: 'categories',
        CONTACTS: 'contacts',
        PROJECTS: 'projects',
        GLOBAL_BUDGETS: 'global_budgets',
        BUDGETS: 'budgets',
        WALLETS: 'wallets',
        WORK_LOGS: 'work_logs',
        STICKY_NOTES: 'sticky_notes',
        CLIENT_QUERIES: 'client_queries',
        CLIENT_QUERIES: 'client_queries',
        STAFF: 'staff',
        SETTINGS: 'settings'
    };

    // Load from LocalStorage on mount
    useEffect(() => {
        // const cached = typeof window !== 'undefined' ? localStorage.getItem('jasper_data') : null;
        // if (cached) {
        //     try {
        //         const data = JSON.parse(cached);
        //         setTransactions(data.transactions || []);
        //         setCategories(data.categories || []);
        //         setContacts(data.contacts || []);
        //         setAllGlobalBudgets(data.allGlobalBudgets || []);
        //         setAllCategoryBudgets(data.allCategoryBudgets || []);
        //         setWallets(data.wallets || []);
        //         setStaffList(data.staffList || []);
        //         setSettings(data.settings || {});
        //         // setLoading(false); // Valid cache found, show immediately
        //     } catch (e) {
        //         console.error("Cache parse error", e);
        //     }
        // }

        // Always fetch fresh data
        localStorage.removeItem('jasper_data'); // FORCE CLEAR OLD DATA
        fetchData();
    }, []);

    // Save to LocalStorage whenever data changes
    useEffect(() => {
        if (!loading && transactions.length > 0) {
            const cache = {
                transactions,
                categories,
                contacts,
                allGlobalBudgets,
                allCategoryBudgets,
                allGlobalBudgets,
                allCategoryBudgets,
                wallets,
                wallets,
                staffList,
                settings
            };
            localStorage.setItem('jasper_data', JSON.stringify(cache));
        }
    }, [transactions, categories, contacts, allGlobalBudgets, allCategoryBudgets, wallets, loading]);

    const fetchData = async () => {
        try {
            // Fetch All Data concurrently
            const results = await Promise.allSettled([
                supabase.from(TABLES.CATEGORIES).select('*'),
                supabase.from(TABLES.CONTACTS).select('*'),
                supabase.from(TABLES.TRANSACTIONS).select(`*, categories (name, icon, type), contacts (name)`).order('transaction_date', { ascending: false }),
                supabase.from(TABLES.GLOBAL_BUDGETS).select('*'),
                supabase.from(TABLES.BUDGETS).select('*'),
                supabase.from(TABLES.WALLETS).select('*'),
                supabase.from(TABLES.WORK_LOGS).select('*').order('created_at', { ascending: false }),
                supabase.from(TABLES.STICKY_NOTES).select('*').order('created_at', { ascending: false }),
                supabase.from(TABLES.CLIENT_QUERIES).select('*').order('created_at', { ascending: false }),
                supabase.from(TABLES.STAFF).select('*').order('created_at', { ascending: false }),
                supabase.from(TABLES.PROJECTS).select(`*, contacts(name)`).order('created_at', { ascending: false }),
                supabase.from('staff_advances').select('*').order('date', { ascending: false }),
                supabase.from('bills').select('*').order('bill_date', { ascending: false }),
                supabase.from('purchases').select('*, suppliers(name)').order('date', { ascending: false }),
                supabase.from(TABLES.SETTINGS).select('*').limit(1)
            ]);

            const [
                catsRes, contsRes, txsRes, gbRes, cbRes, walletsRes,
                workLogsRes, stickyNotesRes, clientQueriesRes, staffRes,
                projectsRes, advRes, billsRes, purRes, settingsRes
            ] = results;

            // Log any errors
            results.forEach((res, index) => {
                if (res.status === 'rejected') {
                    console.error(`Request ${index} failed:`, res.reason);
                } else if (res.value.error) {
                    console.error(`Request ${index} error:`, res.value.error);
                }
            });

            // If any critical request failed, we might want to throw or handle partially
            // For now, let's map data safely
            const getData = (res) => (res.status === 'fulfilled' && !res.value.error ? res.value.data : []);

            setCategories(getData(catsRes));
            setContacts(getData(contsRes));
            setTransactions(getData(txsRes));
            setAllGlobalBudgets(getData(gbRes));
            setAllCategoryBudgets(getData(cbRes));
            setWallets(getData(walletsRes));
            setWorkLogs(getData(workLogsRes));
            setStickyNotes(getData(stickyNotesRes));
            setClientQueries(getData(clientQueriesRes));
            setStaffList(getData(staffRes));
            setProjects(getData(projectsRes));
            setAllStaffAdvances(getData(advRes));
            setBills(getData(billsRes));
            setPurchases(getData(purRes));

            const settingsData = getData(settingsRes);
            setSettings(settingsData && settingsData.length > 0 ? settingsData[0] : {});

            setLoading(false);

        } catch (error) {
            console.error("Error fetching data from Supabase:", error);
            console.warn("If tables are missing, please run the SQL schema script in your Supabase Dashboard.");
            setLoading(false);
        }
    };

    // Add Transaction
    const addTransaction = async (newTx) => {
        try {
            const { amount, type, category_id, description, transaction_date, contact_id, wallet_id } = newTx;

            const payload = {
                amount,
                type,
                category_id: category_id || null,
                description,
                transaction_date: transaction_date || new Date().toISOString().split('T')[0],
                contact_id: contact_id || null,
                is_debt: newTx.is_debt !== undefined ? newTx.is_debt : true, // Default to true if missing
                wallet_id: wallet_id || null, // Ensure wallet_id is stored for edit/delete balance reversal
            };

            const { data, error } = await supabase
                .from(TABLES.TRANSACTIONS)
                .insert([payload])
                .select(`*, categories (name, icon, type), contacts (name)`)
                .single();

            if (error) throw error;

            setTransactions((prev) => [data, ...prev]);

            // Update Wallet Balance if a wallet was selected
            if (wallet_id) {
                const wallet = wallets.find(w => w.id === wallet_id);
                if (wallet) {
                    const newBalance = type === 'income'
                        ? Number(wallet.balance) + Number(amount)
                        : Number(wallet.balance) - Number(amount);

                    await updateWallet(wallet_id, newBalance);
                }
            }

            return { success: true };
        } catch (error) {
            console.error("Error adding transaction:", error);
            return { success: false, error };
        }
    };

    // Add Contact
    const addContact = async (contact) => {
        try {
            const exists = contacts.some(c => c.name.toLowerCase() === contact.name.trim().toLowerCase());
            if (exists) {
                return { success: false, error: { message: "Contact already exists" } };
            }

            const { data, error } = await supabase
                .from(TABLES.CONTACTS)
                .insert([contact])
                .select()
                .single();

            if (error) throw error;

            setContacts(prev => [...prev, data]);
            return { success: true, data };
        } catch (error) {
            console.error("Error adding contact:", error);
            return { success: false, error };
        }
    };



    // Delete Contact
    const deleteContact = async (id) => {
        try {
            const { error } = await supabase.from(TABLES.CONTACTS).delete().eq('id', id);
            if (error) throw error;
            setContacts((prev) => prev.filter((c) => c.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Delete failed:", error);
            return { success: false, error };
        }
    };

    // Update Contact
    const updateContact = async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.CONTACTS)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setContacts((prev) => prev.map((c) => (c.id === id ? data : c)));
            return { success: true };
        } catch (error) {
            console.error("Error updating contact:", error);
            return { success: false, error };
        }
    };

    // Settle Contact
    const settleContact = async (contactId) => {
        try {
            const contact = contactsWithBalances.find(c => c.id === contactId);
            if (!contact) throw new Error("Contact not found");

            const balance = contact.balance || 0;
            if (balance === 0) return { success: true, message: "Already settled" };

            const type = balance > 0 ? "income" : "expense";
            const amount = Math.abs(balance);

            const payload = {
                contact_id: contactId,
                amount: amount,
                type: type,
                description: "Account Settled",
                transaction_date: new Date().toISOString().split('T')[0],
                category_id: null
            };

            const { data, error } = await supabase
                .from(TABLES.TRANSACTIONS)
                .insert([payload])
                .select(`*, categories (name, icon, type), contacts (name)`)
                .single();

            if (error) throw error;

            setTransactions(prev => [data, ...prev]);
            return { success: true };
        } catch (error) {
            console.error("Error settling account:", error);
            return { success: false, error };
        }
    };

    // Delete Transaction
    const deleteTransaction = async (id) => {
        try {
            const tx = transactions.find(t => t.id === id);
            if (!tx) throw new Error("Transaction not found");

            // Reverse wallet balance if applicable
            if (tx.wallet_id) {
                const wallet = wallets.find(w => w.id === tx.wallet_id);
                if (wallet) {
                    const reversalAmount = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
                    await updateWallet(tx.wallet_id, Number(wallet.balance) + reversalAmount);
                }
            }

            const { error } = await supabase.from(TABLES.TRANSACTIONS).delete().eq('id', id);
            if (error) throw error;
            setTransactions((prev) => prev.filter((t) => t.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting transaction:", error);
            return { success: false, error };
        }
    };

    // Update Transaction
    const updateTransaction = async (id, updates) => {
        try {
            const oldTx = transactions.find(t => t.id === id);
            if (!oldTx) throw new Error("Transaction not found");

            // 1. Revert Old Wallet Impact
            if (oldTx.wallet_id) {
                const oldWallet = wallets.find(w => w.id === oldTx.wallet_id);
                if (oldWallet) {
                    const reversal = oldTx.type === 'income' ? -Number(oldTx.amount) : Number(oldTx.amount);
                    await updateWallet(oldTx.wallet_id, Number(oldWallet.balance) + reversal);
                }
            }

            // 2. Prepare Update Payload
            const payload = {
                ...updates,
                transaction_date: updates.transaction_date || oldTx.transaction_date, // Keep old date if not changed
            };

            // 3. Update in DB
            const { data, error } = await supabase
                .from(TABLES.TRANSACTIONS)
                .update(payload)
                .eq('id', id)
                .select(`*, categories (name, icon, type), contacts (name)`)
                .single();

            if (error) throw error;

            // 4. Apply New Wallet Impact
            // Note: We need to re-fetch wallets state to get latest balance after revert? 
            // Actually, updateWallet updates local state immediately, so 'wallets' might be stale in this closure 
            // but updateWallet uses prev state setter, so it's fine. 
            // However, finding 'newWallet' here might get stale balance if we don't wait or use functional updates.
            // Be careful: updateWallet is async and updates state.

            // To be safe, let's just re-read the wallet from the Updated State or trust the flow.
            // Better: updateWallet handles the DB update.

            const newWalletId = updates.wallet_id || oldTx.wallet_id;
            const newAmount = updates.amount !== undefined ? updates.amount : oldTx.amount;
            const newType = updates.type || oldTx.type;

            if (newWalletId) {
                // We need to fetch the *latest* balance because the revert above might have changed it.
                // But since we can't await state updates easily here without a refetch, 
                // we can calculate the net change if it's the same wallet, or just do two updates.
                // Simplest robust way: Fetch the specific wallet from DB to get current balance? No, too slow.
                // Let's rely on the fact that updateWallet updates the local 'wallets' state.
                // BUT 'wallets' in this scope is closed over. 

                // Let's do a trick: Pass a callback or just do it optimistically based on what we know.
                // We reversed the old effect. Now we apply the new effect.

                // If same wallet:
                // Balance = (Balance - OldEffect) + NewEffect

                // If different wallet:
                // OldWallet = Balance - OldEffect
                // NewWallet = Balance + NewEffect

                // Since updateWallet writes to DB, we can just call it again.
                // The issue is knowing the "current" balance to add/subtract from.

                // Let's refetch the wallet to be safe? Or just use the local state update logic carefully.
                // For now, let's assume sequential execution is fast enough or use a fresh fetch for the wallet balance 
                // if we really want to be consistent. 
                // OR: just do the math locally.

                const { data: currentWallet } = await supabase.from(TABLES.WALLETS).select('balance').eq('id', newWalletId).single();

                if (currentWallet) {
                    const impact = newType === 'income' ? Number(newAmount) : -Number(newAmount);
                    await updateWallet(newWalletId, Number(currentWallet.balance) + impact);
                }
            }

            setTransactions((prev) => prev.map((t) => t.id === id ? data : t));
            return { success: true };
        } catch (error) {
            console.error("Error updating transaction:", error);
            return { success: false, error };
        }
    };

    // Update Global Budget
    const updateGlobalBudget = async (newAmount, monthYear) => {
        try {
            const targetMonth = monthYear || new Date().toISOString().slice(0, 7);
            const existingBudget = allGlobalBudgets.find(b => b.month_year === targetMonth);

            const payload = {
                month_year: targetMonth,
                amount_limit: newAmount,
            };

            let data, error;
            if (existingBudget?.id) {
                // Update
                ({ data, error } = await supabase
                    .from(TABLES.GLOBAL_BUDGETS)
                    .update(payload)
                    .eq('id', existingBudget.id)
                    .select()
                    .single());

                if (error) throw error;
                setAllGlobalBudgets(prev => prev.map(b => b.id === existingBudget.id ? data : b));
            } else {
                // Insert
                ({ data, error } = await supabase
                    .from(TABLES.GLOBAL_BUDGETS)
                    .insert([payload])
                    .select()
                    .single());

                if (error) throw error;
                setAllGlobalBudgets(prev => [...prev, data]);
            }

            return { success: true };
        } catch (error) {
            console.error("Error updating budget:", error);
            return { success: false, error };
        }
    };

    // Add Category
    const addCategory = async (name, type, icon) => {
        try {
            const payload = { name, type, icon: icon || (type === 'income' ? 'ArrowDownLeft' : 'ShoppingCart') };
            const { data, error } = await supabase
                .from(TABLES.CATEGORIES)
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            setCategories(prev => [...prev, data]);
            return { success: true, data };
        } catch (error) {
            console.error("Error adding category:", error);
            return { success: false, error };
        }
    };

    // Delete Category
    const deleteCategory = async (id) => {
        try {
            const isUsed = transactions.some(t => t.category_id === id);
            if (isUsed) {
                return { success: false, error: { message: "Cannot delete category with existing transactions." } };
            }

            const { error } = await supabase.from(TABLES.CATEGORIES).delete().eq('id', id);
            if (error) throw error;

            setCategories(prev => prev.filter(c => c.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting category:", error);
            return { success: false, error };
        }
    };

    // Update Category Budget
    const updateCategoryBudget = async (categoryId, newLimit, monthYear) => {
        try {
            const targetMonth = monthYear || new Date().toISOString().slice(0, 7);
            const existing = allCategoryBudgets.find(b => b.category_id === categoryId && b.month_year === targetMonth);

            let data, error;
            if (existing) {
                // Update
                ({ data, error } = await supabase
                    .from(TABLES.BUDGETS)
                    .update({ amount_limit: newLimit })
                    .eq('id', existing.id)
                    .select()
                    .single());
            } else {
                // Create
                ({ data, error } = await supabase
                    .from(TABLES.BUDGETS)
                    .insert([{
                        category_id: categoryId,
                        amount_limit: newLimit,
                        month_year: targetMonth
                    }])
                    .select()
                    .single());
            }

            if (error) throw error;

            setAllCategoryBudgets(prev => {
                const filtered = prev.filter(b => !(b.category_id === categoryId && b.month_year === targetMonth));
                return [...filtered, data];
            });

            return { success: true };
        } catch (error) {
            console.error("Error updating category budget:", error);
            return { success: false, error };
        }
    };

    // Helper: Add Wallet
    const addWallet = async (name, type, balance = 0) => {
        try {
            const payload = { name, type, balance: Number(balance) };
            const { data, error } = await supabase
                .from(TABLES.WALLETS)
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            setWallets(prev => [...prev, data]);
            return { success: true, data };
        } catch (error) {
            console.error("Error adding wallet:", error);
            return { success: false, error };
        }
    };

    // Helper: Update Wallet Balance
    const updateWallet = async (id, newBalance) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.WALLETS)
                .update({ balance: Number(newBalance) })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setWallets(prev => prev.map(w => w.id === id ? data : w));
            return { success: true };
        } catch (error) {
            console.error("Error updating wallet:", error);
            return { success: false, error };
        }
    };

    // Helper: Delete Wallet
    const deleteWallet = async (id) => {
        try {
            const { error } = await supabase.from(TABLES.WALLETS).delete().eq('id', id);
            if (error) throw error;
            setWallets(prev => prev.filter(w => w.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting wallet:", error);
            return { success: false, error };
        }
    };

    // Helper: Get Financials for a Specific Month
    const getFinancials = React.useCallback((monthStr) => {
        const targetMonth = monthStr || new Date().toISOString().slice(0, 7);

        // Filter transactions for this month
        const [year, month] = targetMonth.split('-');
        const monthTransactions = transactions.filter(t => {
            const d = new Date(t.transaction_date);
            return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
        });

        const isSameMonth = (dateStr) => {
            const d = new Date(dateStr);
            return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
        };

        // 1. Transactions Income (Direct Income)
        const transIncome = monthTransactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // 2. Bills Income (Contracting - Paid Bills in this month)
        // Assuming bills have a 'payment_date' or we use 'date' if paid.
        // Let's use 'date' for now, but strictly filtering by status='Paid'
        const billsIncome = bills
            .filter(b => b.status === "Paid" && isSameMonth(b.date))
            .reduce((sum, b) => sum + Number(b.total_amount || b.grand_total || 0), 0);

        const income = transIncome + billsIncome;

        // 3. Transactions Expense (Direct Expense)
        const transExpense = monthTransactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // 4. Purchases Expense (Marketing)
        const purchasesExpense = purchases
            .filter(p => isSameMonth(p.date))
            .reduce((sum, p) => sum + Number(p.total_amount), 0);

        // 5. Staff Advances (Salary/Labor Expense)
        const staffExpense = allStaffAdvances
            .filter(a => isSameMonth(a.date))
            .reduce((sum, a) => sum + Number(a.amount), 0);

        const expense = transExpense + purchasesExpense + staffExpense;

        const balance = income - expense;

        // Budget Logic (Excluding Contact Transactions) - Keep as is for now for budget tracking
        const budgetableExpenses = monthTransactions.filter(t => t.type === 'expense' && !t.contact_id);
        const budgetObj = allGlobalBudgets.find(b => b.month_year === targetMonth);
        const budgetLimit = budgetObj?.amount_limit || 80000;
        const budgetUsed = budgetableExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
        const budgetRemaining = budgetLimit - budgetUsed;
        const spendingPercentage = budgetLimit > 0 ? Math.round((budgetUsed / budgetLimit) * 100) : 0;

        // Solvency
        const solvencyGap = budgetRemaining - balance;
        const isInsolvent = solvencyGap > 0;

        // Savings Rate
        const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

        // Runway (using Global Balance from all time streams)
        const globalTotalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) +
            bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + Number(b.total_amount || b.grand_total || 0), 0);

        const globalTotalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) +
            purchases.reduce((sum, p) => sum + Number(p.total_amount), 0) +
            allStaffAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

        const globalBalance = globalTotalIncome - globalTotalExpense;

        const burnRate = expense > 0 ? expense : 0;
        let runway = "No Burn";
        if (burnRate > 0) {
            const months = globalBalance / burnRate;
            runway = months > 60 ? "60+" : Math.round(months).toString();
        } else if (globalBalance === 0) {
            runway = "0";
        }

        // Top Category
        const expenseByCategory = budgetableExpenses
            .reduce((acc, t) => {
                const catName = t.categories?.name || 'Uncategorized';
                acc[catName] = (acc[catName] || 0) + Number(t.amount);
                return acc;
            }, {});

        const topCategoryEntry = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
        const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : "No expenses";
        const topCategoryAmount = topCategoryEntry ? topCategoryEntry[1] : 0;

        // Category Metrics
        const categoryMetrics = categories.filter(c => c.type === 'expense').map(cat => {
            const limitEntry = allCategoryBudgets.find(b => b.category_id === cat.id && b.month_year === targetMonth);
            const limit = limitEntry ? Number(limitEntry.amount_limit) : 0;
            const used = expenseByCategory[cat.name] || 0;

            return {
                id: cat.id,
                name: cat.name,
                icon: cat.icon,
                limit,
                used,
                remaining: Math.max(0, limit - used),
                pct: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
            };
        });

        return {
            balance, // Monthly Balance (Surplus/Deficit)
            income,
            expense,
            budgetLimit,
            budgetUsed,
            budgetRemaining,
            spendingPercentage,
            solvency: { isInsolvent, gap: solvencyGap },
            savingsRate,
            runway, // Keep global runway
            topCategory: { name: topCategoryName, amount: topCategoryAmount },
            categoryMetrics
        };
    }, [transactions, bills, purchases, allStaffAdvances, allGlobalBudgets, allCategoryBudgets, categories]);

    // Derived State for Current Month (Backwards Compatibility)
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    // Memoize currentFinancials to prevent re-render loop
    const currentFinancials = React.useMemo(() => getFinancials(currentMonthStr), [getFinancials, currentMonthStr]);

    // Contact Balances Calculation (Global)
    const contactsWithBalances = React.useMemo(() => contacts.map(contact => {
        const contactTxs = transactions.filter(t => t.contact_id === contact.id);
        // Only count transactions where is_debt is TRUE (default)
        // If is_debt is FALSE, it's a direct settlement/payment that doesn't affect the "Loan/Debt" balance tracking
        const debtTxs = contactTxs.filter(t => t.is_debt !== false);

        const debtValue = debtTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        const creditValue = debtTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        return { ...contact, balance: debtValue - creditValue };
    }), [contacts, transactions]);

    // Modal State
    const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
    const [addTxInitialType, setAddTxInitialType] = useState("expense");

    // --- Operations Module Helpers ---

    // 1. Work Logs
    const addWorkLog = async (log) => {
        try {
            const { data, error } = await supabase.from(TABLES.WORK_LOGS).insert([{ ...log, date: log.date || new Date() }]).select().single();
            if (error) throw error;
            setWorkLogs(prev => [data, ...prev]);
            return { success: true };
        } catch (error) {
            console.error("Error adding work log:", error);
            return { success: false, error };
        }
    };

    const toggleWorkLog = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
            const { data, error } = await supabase.from(TABLES.WORK_LOGS).update({ status: newStatus }).eq('id', id).select().single();
            if (error) throw error;
            setWorkLogs(prev => prev.map(l => l.id === id ? data : l));
            return { success: true };
        } catch (error) {
            console.error("Error toggling work log:", error);
            return { success: false, error };
        }
    };

    const deleteWorkLog = async (id) => {
        try {
            const { error } = await supabase.from(TABLES.WORK_LOGS).delete().eq('id', id);
            if (error) throw error;
            setWorkLogs(prev => prev.filter(l => l.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting work log:", error);
            return { success: false, error };
        }
    };

    const updateWorkLog = async (id, updates) => {
        try {
            const { data, error } = await supabase.from(TABLES.WORK_LOGS).update(updates).eq('id', id).select().single();
            if (error) throw error;
            setWorkLogs(prev => prev.map(l => l.id === id ? data : l));
            return { success: true };
        } catch (error) {
            console.error("Error updating work log:", error);
            return { success: false, error };
        }
    };




    // --- Contracting Module Helpers ---

    // 1. Estimates
    const [estimates, setEstimates] = useState([]);

    const fetchEstimates = async () => {
        try {
            const { data, error } = await supabase.from('estimates').select('*, estimate_items(*)').order('created_at', { ascending: false });
            if (error) throw error;
            setEstimates(data || []);
        } catch (error) {
            console.error("Error fetching estimates:", error);
        }
    };

    // Auto-fetch on mount (can be optimized later)
    useEffect(() => {
        fetchEstimates();
    }, []);

    const createEstimate = async (estimateData, items = []) => {
        try {
            // 1. Create Estimate
            const { data: estData, error: estError } = await supabase.from('estimates').insert([estimateData]).select().single();
            if (estError) throw estError;

            // 2. Create Items (if any)
            if (items.length > 0) {
                const itemsWithId = items.map(item => ({
                    estimate_id: estData.id,
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount
                    // Exclude category/inventory_id as schema likely doesn't support them yet
                }));
                const { error: itemsError } = await supabase.from('estimate_items').insert(itemsWithId);
                if (itemsError) throw itemsError;
            }

            // Refresh local state (easiest way to get full structure)
            await fetchEstimates();
            return { success: true, id: estData.id };
        } catch (error) {
            console.error("Error creating estimate:", JSON.stringify(error, null, 2));
            return { success: false, error };
        }
    };

    const deleteEstimate = async (id) => {
        try {
            const { error } = await supabase.from('estimates').delete().eq('id', id);
            if (error) throw error;
            setEstimates(prev => prev.filter(e => e.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting estimate:", error);
            return { success: false, error };
        }
    };

    const updateEstimateStatus = async (id, status) => {
        try {
            const { error } = await supabase.from('estimates').update({ status }).eq('id', id);
            if (error) throw error;
            setEstimates(prev => prev.map(e => e.id === id ? { ...e, status } : e));
            return { success: true };
        } catch (error) {
            console.error("Error updating estimate status:", error);
            return { success: false, error };
        }
    };

    const updateEstimate = async (id, estimateData, items) => {
        try {
            // 1. Update Estimate Details
            const { error: estError } = await supabase.from('estimates').update(estimateData).eq('id', id);
            if (estError) throw estError;

            // 2. Replace Items (Strategy: Delete all -> Insert new)
            // This is safer than diffing for now
            const { error: deleteError } = await supabase.from('estimate_items').delete().eq('estimate_id', id);
            if (deleteError) throw deleteError;

            if (items.length > 0) {
                const itemsWithId = items.map(item => {
                    const { id: _, ...rest } = item;
                    return { ...rest, estimate_id: id };
                });
                const { error: itemsError } = await supabase.from('estimate_items').insert(itemsWithId);
                if (itemsError) throw itemsError;
            }

            // Refresh
            await fetchEstimates();
            return { success: true };
        } catch (error) {
            console.error("Error updating estimate:", error);
            return { success: false, error };
        }
    };

    // 2. Measurements
    const [measurements, setMeasurements] = useState([]);

    const fetchMeasurements = async () => {
        try {
            const { data, error } = await supabase.from('measurements').select('*, measurement_items(*)').order('created_at', { ascending: false });
            if (error) throw error;
            setMeasurements(data || []);
        } catch (error) {
            console.error("Error fetching measurements:", error);
        }
    };

    // Auto-fetch on mount
    useEffect(() => {
        fetchMeasurements();
    }, []);

    const createMeasurement = async (data, items = []) => {
        try {
            // 1. Create Measurement
            const { data: mData, error: mError } = await supabase.from('measurements').insert([data]).select().single();
            if (mError) throw mError;

            // 2. Create Items
            if (items.length > 0) {
                const itemsWithId = items.map(item => ({ ...item, measurement_id: mData.id }));
                const { error: itemsError } = await supabase.from('measurement_items').insert(itemsWithId);
                if (itemsError) throw itemsError;
            }

            await fetchMeasurements();
            return { success: true, id: mData.id };
        } catch (error) {
            console.error("Error creating measurement:", error);
            return { success: false, error };
        }
    };

    const deleteMeasurement = async (id) => {
        try {
            const { error } = await supabase.from('measurements').delete().eq('id', id);
            if (error) throw error;
            setMeasurements(prev => prev.filter(m => m.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting measurement:", error);
            return { success: false, error };
        }
    };

    // 3. Bills
    // bills state defined globally

    const fetchBills = async () => {
        try {
            const { data, error } = await supabase.from('bills').select('*, bill_items(*)').order('created_at', { ascending: false });
            if (error) throw error;
            setBills(data || []);
        } catch (error) {
            console.error("Error fetching bills:", error);
        }
    };

    const createBill = async (data, items = []) => {
        try {
            // 1. Create Bill
            const { data: bData, error: bError } = await supabase.from('bills').insert([data]).select().single();
            if (bError) throw bError;

            // 2. Create Bill Items
            if (items.length > 0) {
                const itemsWithId = items.map(item => ({ ...item, bill_id: bData.id }));
                const { error: itemsError } = await supabase.from('bill_items').insert(itemsWithId);
                if (itemsError) throw itemsError;
            }

            await fetchBills();
            return { success: true, id: bData.id };
        } catch (error) {
            console.error("Error creating bill:", JSON.stringify(error, null, 2));
            console.error(error);
            return { success: false, error };
        }
    };

    const deleteBill = async (id) => {
        try {
            const { error } = await supabase.from('bills').delete().eq('id', id);
            if (error) throw error;
            setBills(prev => prev.filter(b => b.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting bill:", error);
            return { success: false, error };
        }
    };



    // 4. Staff Management - now handled by global fetchData
    // Keeping specific add/update functions below


    const addStaff = async (staffData) => {
        try {
            const { data, error } = await supabase.from('staff').insert([staffData]).select().single();
            if (error) throw error;
            setStaffList(prev => [...prev, data]);
            return { success: true };
        } catch (error) {
            console.error("Error adding staff:", error);
            return { success: false, error };
        }
    };

    const markAttendance = async (date, records) => {
        // records: [{ staff_id, status }]
        try {
            // Upsert attendance
            const upsertData = records.map(r => ({
                staff_id: r.staff_id,
                date: date,
                status: r.status
            }));

            const { error } = await supabase.from('staff_attendance').upsert(upsertData, { onConflict: 'staff_id,date' });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Error marking attendance:", error);
            return { success: false, error };
        }
    };

    const getStaffDetails = async (id, month, year) => {
        try {
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

            // Fetch Attendance
            const { data: attData } = await supabase.from('staff_attendance')
                .select('*')
                .eq('staff_id', id)
                .gte('date', startDate)
                .lte('date', endDate);

            // Fetch Advances/Payments (All time to calculate balance, or just this month?)
            // Usually we need running balance. For now simpler: fetch recent.
            // Actually, for "Accounts", we need total taken vs total salary earned.
            // That's complex. Let's start with just Listing Advances.
            const { data: advData } = await supabase.from('staff_advances')
                .select('*')
                .eq('staff_id', id)
                .order('date', { ascending: false });

            return { attendance: attData || [], advances: advData || [] };
        } catch (error) {
            console.error(error);
            return { attendance: [], advances: [] };
        }
    };

    const addStaffAdvance = async (advanceData) => {
        try {
            const { error } = await supabase.from('staff_advances').insert([advanceData]);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(error);
            return { success: false, error };
        }
    };

    const updateStaff = async (id, updates) => {
        try {
            const { error } = await supabase.from(TABLES.STAFF).update(updates).eq('id', id);
            if (error) throw error;
            setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            return { success: true };
        } catch (error) {
            console.error("Error updating staff:", error);
            return { success: false, error };
        }
    };

    const deleteStaff = async (id) => {
        try {
            // Cascade delete happens in DB, but good to be safe/aware
            const { error } = await supabase.from('staff').delete().eq('id', id);
            if (error) throw error;
            setStaffList(prev => prev.filter(s => s.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting staff:", error);
            return { success: false, error };
        }
    };

    // 5. Marketing (Suppliers, Inventory, Purchases)
    // moved to top


    const fetchMarketingData = async () => {
        try {
            const [supRes, invRes, purRes, shopRes] = await Promise.all([
                supabase.from('suppliers').select('*').order('name'),
                supabase.from('inventory').select('*').order('item_name'),
                supabase.from('purchases').select('*, suppliers(name)').order('date', { ascending: false }),
                supabase.from('shopping_list').select('*').order('date_needed', { ascending: true })
            ]);

            if (supRes.error) throw supRes.error;
            if (invRes.error) throw invRes.error;
            if (purRes.error) throw purRes.error;

            setSuppliers(supRes.data || []);
            setInventory(invRes.data || []);
            setPurchases(purRes.data || []);
            setShoppingList(shopRes.data || []);
        } catch (error) {
            console.error("Error fetching marketing data:", JSON.stringify(error, null, 2));
        }
    };

    useEffect(() => {
        fetchMarketingData();
    }, []);

    const addSupplier = async (supplier) => {
        try {
            const { data, error } = await supabase.from('suppliers').insert([supplier]).select().single();
            if (error) throw error;
            setSuppliers(prev => [...prev, data]);
            return { success: true };
        } catch (error) {
            console.error("Error adding supplier:", JSON.stringify(error, null, 2));
            return { success: false, error };
        }
    };

    const addInventoryItem = async (item) => {
        try {
            // Map frontend fields (item_name) to DB fields (item_name)
            const payload = {
                item_name: item.item_name,
                category: item.category,
                unit: item.unit,
                current_stock: item.current_stock || 0,
                base_rate: item.base_rate,
                weight_per_unit: item.weight_per_unit
            };
            const { data, error } = await supabase.from('inventory').insert([payload]).select().single();
            if (error) throw error;

            setInventory(prev => [...prev, data]);
            return { success: true };
        } catch (error) {
            console.error("Error adding inventory:", JSON.stringify(error, null, 2));
            return { success: false, error };
        }
    };

    const updateInventoryItem = async (id, updates) => {
        try {
            const { error } = await supabase.from('inventory').update(updates).eq('id', id);
            if (error) throw error;
            setInventory(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
            return { success: true };
        } catch (error) {
            console.error("Error updating inventory:", error);
            return { success: false, error };
        }
    };

    const deleteInventoryItem = async (id) => {
        try {
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (error) throw error;
            setInventory(prev => prev.filter(i => i.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting inventory:", error);
            return { success: false, error };
        }
    };

    const createPurchase = async (purchaseData, items) => {
        // purchaseData: { supplier_id, date, total_amount, invoice_number }
        // items: [{ inventory_item_id, quantity, rate, amount }]
        try {
            // 1. Create Purchase Record
            const { data: pData, error: pError } = await supabase.from('purchases').insert([purchaseData]).select().single();
            if (pError) throw pError;

            // 2. Create Purchase Items
            const itemsWithId = items.map(i => ({ ...i, purchase_id: pData.id }));
            const { error: iError } = await supabase.from('purchase_items').insert(itemsWithId);
            if (iError) throw iError;

            // 3. Update Inventory Stock (Simple increment)
            for (const item of items) {
                if (item.inventory_item_id) {
                    // Get current stock
                    const currentItem = inventory.find(i => i.id === item.inventory_item_id);
                    const currentStock = Number(currentItem?.current_stock || 0);
                    const newStock = currentStock + Number(item.quantity);

                    await supabase.from('inventory').update({ current_stock: newStock }).eq('id', item.inventory_item_id);
                }
            }

            await fetchMarketingData(); // Refresh all to get updated stock and list
            return { success: true };
        } catch (error) {
            console.error("Error creating purchase:", JSON.stringify(error, null, 2));
            return { success: false, error };
        }
    };


    // 6. Sticky Notes
    const addStickyNote = async (note) => {
        try {
            const { data, error } = await supabase.from(TABLES.STICKY_NOTES).insert([{ ...note, date: new Date() }]).select().single();
            if (error) throw error;
            setStickyNotes(prev => [data, ...prev]);
            return { success: true };
        } catch (error) {
            console.error("Error adding sticky note:", error);
            return { success: false, error };
        }
    };

    const deleteStickyNote = async (id) => {
        try {
            const { error } = await supabase.from(TABLES.STICKY_NOTES).delete().eq('id', id);
            if (error) throw error;
            setStickyNotes(prev => prev.filter(n => n.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting sticky note:", error);
            return { success: false, error };
        }
    };

    // 3. Client Queries
    const addClientQuery = async (query) => {
        try {
            const { data, error } = await supabase.from(TABLES.CLIENT_QUERIES).insert([{ ...query, status: 'new' }]).select().single();
            if (error) throw error;
            setClientQueries(prev => [data, ...prev]);
            return { success: true };
        } catch (error) {
            console.error("Error adding client query:", error);
            return { success: false, error };
        }
    };

    const deleteClientQuery = async (id) => {
        try {
            const { error } = await supabase.from(TABLES.CLIENT_QUERIES).delete().eq('id', id);
            if (error) throw error;
            setClientQueries(prev => prev.filter(q => q.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting client query:", error);
            return { success: false, error };
        }
    };

    const updateClientQueryStatus = async (id, newStatus) => {
        try {
            const { data, error } = await supabase.from(TABLES.CLIENT_QUERIES).update({ status: newStatus }).eq('id', id).select().single();
            if (error) throw error;
            setClientQueries(prev => prev.map(q => q.id === id ? data : q));
            return { success: true };
        } catch (error) {
            console.error("Error updating query status:", error);
            return { success: false, error };
        }
    };

    // Shopping List Functions


    const addToShoppingList = async (item) => {
        try {
            const { data, error } = await supabase.from('shopping_list').insert([item]).select().single();
            if (error) throw error;
            setShoppingList(prev => [data, ...prev]);
            return { success: true };
        } catch (error) {
            console.error("Error adding to shopping list:", error);
            return { success: false, error };
        }
    };

    const updateShoppingListItem = async (id, updates) => {
        try {
            const { error } = await supabase.from('shopping_list').update(updates).eq('id', id);
            if (error) throw error;
            setShoppingList(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
            return { success: true };
        } catch (error) {
            console.error("Error updating shopping list item:", error);
            return { success: false, error };
        }
    };

    const deleteShoppingListItem = async (id) => {
        try {
            const { error } = await supabase.from('shopping_list').delete().eq('id', id);
            if (error) throw error;
            setShoppingList(prev => prev.filter(i => i.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting shopping list item:", error);
            return { success: false, error };
        }
    };

    // 7. Projects
    const addProject = async (projectData) => {
        try {
            const { data, error } = await supabase.from(TABLES.PROJECTS).insert([projectData]).select().single();
            if (error) throw error;
            setProjects(prev => [data, ...prev]);
            return { success: true, id: data.id };
        } catch (error) {
            console.error("Error adding project:", error);
            return { success: false, error };
        }
    };

    const updateProject = async (id, updates) => {
        try {
            const { data, error } = await supabase.from(TABLES.PROJECTS).update(updates).eq('id', id).select(`*, clients(name)`).single();
            if (error) throw error;
            setProjects(prev => prev.map(p => p.id === id ? data : p));
            return { success: true };
        } catch (error) {
            console.error("Error updating project:", error);
            return { success: false, error };
        }
    };

    const deleteProject = async (id) => {
        try {
            const { error } = await supabase.from(TABLES.PROJECTS).delete().eq('id', id);
            if (error) throw error;
            setProjects(prev => prev.filter(p => p.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Error deleting project:", error);
            return { success: false, error };
        }
    };

    return (
        <FinanceContext.Provider
            value={{
                transactions,
                categories,
                contacts: contactsWithBalances,
                projects,
                addProject,
                updateProject,
                deleteProject,
                totalLiquidAssets: wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0),
                addContact,
                updateWallet,
                updateContact,
                deleteContact,
                settleContact,
                loading,
                addTransaction,
                updateTransaction,
                deleteTransaction,
                updateGlobalBudget,
                updateCategoryBudget,
                wallets,
                addWallet,
                updateWallet,
                deleteWallet,
                addCategory,
                deleteCategory,
                isAddTxModalOpen,
                openAddTxModal: (type) => {
                    setAddTxInitialType(type || "expense");
                    setIsAddTxModalOpen(true);
                },
                closeAddTxModal: () => setIsAddTxModalOpen(false),
                addTxInitialType,
                getFinancials,
                financials: currentFinancials,
                // Operations
                workLogs,
                stickyNotes,
                clientQueries,
                addWorkLog,
                toggleWorkLog,
                deleteWorkLog,
                updateWorkLog,
                addStickyNote,
                deleteStickyNote,
                addClientQuery,
                updateClientQueryStatus,
                deleteClientQuery,
                // Staff
                staffList,
                estimates,
                createEstimate,
                deleteEstimate,
                updateEstimateStatus,
                updateEstimate,
                measurements,
                createMeasurement,
                deleteMeasurement,
                bills,
                createBill,
                deleteBill,
                staffList,
                addStaff,
                updateStaff,
                markAttendance,
                getStaffDetails,
                addStaffAdvance,
                deleteStaff,
                suppliers,
                inventory,
                purchases,
                shoppingList,
                addSupplier,
                addInventoryItem,
                updateInventoryItem,
                deleteInventoryItem, // Assuming this exists or I will verify
                createPurchase,
                addToShoppingList,
                updateShoppingListItem,
                deleteShoppingListItem,
                settings,
                updateSettings: async (newSettings) => {
                    const { error } = await supabase.from(TABLES.SETTINGS).upsert({ id: 1, ...newSettings });
                    if (!error) {
                        setSettings(prev => ({ ...prev, ...newSettings }));
                        return { success: true };
                    }
                    return { success: false, error };
                }
            }}
        >
            {children}
        </FinanceContext.Provider>
    );
}

export const useFinance = () => useContext(FinanceContext);
