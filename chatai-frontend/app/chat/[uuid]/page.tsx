import ChatContainer from "../components/ChatContainer";

const Conversation = ({ params }: { params: { uuid: string } }) => {
  return <ChatContainer uuid={params.uuid} />;
};

export default Conversation;
