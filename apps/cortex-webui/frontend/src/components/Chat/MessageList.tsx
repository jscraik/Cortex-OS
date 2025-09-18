import MessageItem from './MessageItem';

interface MessageListProps {
	readonly messages: Array<{
		id: string;
		role: string;
		content: string;
		[key: string]: unknown;
	}>;
	readonly streaming: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, streaming }) => {
	return (
		<div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions">
			{messages.map((message) => (
				<MessageItem key={message.id} message={message} />
			))}
			{streaming && (
				<div className="flex justify-start">
					<div className="max-w-[80%]">
						<div className="text-xs text-gray-500">assistant</div>
						<div className="glass-card px-3 py-2 rounded-xl">
							<span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1"></span>
							<span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1 delay-75"></span>
							<span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full delay-150"></span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default MessageList;
