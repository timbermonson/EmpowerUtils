interface I_InputIterator<ItemType> {
    getItemList(): void
    getItem(lineNumnumber): ItemType
    getNextItem(): Promise<ItemType>
    offerSkipSearch(): Promise<void>
    back(): void
}
