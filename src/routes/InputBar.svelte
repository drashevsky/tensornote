<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    let text : string = '';
    // let oldtext : string = '';
    let debounce : NodeJS.Timeout = setTimeout(() => {}, 0); 

    async function inputBarUpdated() {
        
        // Make sure embedding is updated every 125 ms
        clearTimeout(debounce);
        debounce = setTimeout((async (t : string) => {
            if (text == t)
                dispatch('inputbarupdate', {text});
        }).bind(null, text), 125);

        // Trigger re-embed every 4 characters or every word
        // if (text.split(" ").length != oldtext.split(" ").length || 
        //    Math.abs(text.length - oldtext.length) >= 4) {
        //    oldtext = text;
        //    dispatch('inputbarupdate', {text});
        // }
    }

    $: text && inputBarUpdated();
</script>

<div class="fixed bottom-0 w-full h-[20%]">
    <textarea class="w-full h-full" placeholder="Type or search for a note." bind:value={text}/>
</div>