#[allow(lint(self_transfer))]
module voting_package::voting {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::vector;

    // Structure to store voting data
    public struct Voting has key { // 'store' не нужен для shared object
        id: UID,
        options: vector<vector<u8>>, // Voting options as vectors of bytes
        votes: vector<u64>,          // Number of votes for each option
        is_active: bool,             // Is the voting active
    }

    // Initialize a new voting session and share it
    public fun init_voting(ctx: &mut TxContext) {
        let voting = Voting {
            id: object::new(ctx),
            options: vector[b"Yes", b"No"], // Можно инициализировать сразу
            votes: vector[0, 0],
            is_active: true, // Голосование активно сразу при создании
        };
        // Делаем объект общим, чтобы другие могли с ним взаимодействовать
        transfer::share_object(voting);
    }

    // Vote for an option (index 0 for "Yes", 1 for "No")
    // Теперь 'voting' это shared object, поэтому мы принимаем его по ссылке
    public fun vote(voting: &mut Voting, option_index: u64, _ctx: &mut TxContext) {
        assert!(voting.is_active, 0); // Check if the voting is active (Код ошибки 0)
        assert!(option_index < vector::length(&voting.options), 1); // Check if the index is valid (Код ошибки 1)
        
        let current_votes = vector::borrow_mut(&mut voting.votes, option_index);
        *current_votes = *current_votes + 1;
    }

    // End the voting
    public fun end_voting(voting: &mut Voting, _ctx: &mut TxContext) { // Добавляем TxContext для проверки прав
        // В реальном проекте здесь нужна проверка, что _ctx.sender() является админом
        voting.is_active = false;
    }

    // Get the results (функция только для чтения, не изменяет состояние)
    #[view]
    public fun get_results(voting: &Voting): (vector<vector<u8>>, vector<u64>) {
        (voting.options, voting.votes)
    }
}